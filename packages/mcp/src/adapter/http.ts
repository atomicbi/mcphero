import { Action, AdapterFactory, buildLogLevels, Logger, SideloadResource, toolResponse } from '@mcphero/core'
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js'
import { createMcpExpressApp, CreateMcpExpressAppOptions } from '@modelcontextprotocol/sdk/server/express.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { capitalCase, pascalCase } from 'change-case'
import cors from 'cors'
import { randomUUID } from 'crypto'
import { Request, Response } from 'express'
import { readFile } from 'fs/promises'
import { Server } from 'http'

export interface HttpAdapterOptions extends CreateMcpExpressAppOptions {
  host: string
  port: number
}

export const http: AdapterFactory<HttpAdapterOptions> = ({ host, port, ...mcpOptions }) => {
  return (options, baseContext) => {
    const context = baseContext.fork({ adapter: 'http' })
    const app = createMcpExpressApp({ ...mcpOptions, host })
    app.use(cors({ exposedHeaders: ['WWW-Authenticate', 'Mcp-Session-Id', 'Last-Event-Id', 'Mcp-Protocol-Version'], origin: '*' }))
    const transports: Record<string, StreamableHTTPServerTransport> = {}
    let mountedActions: Action[] = []

    const createServer = () => {
      const server = new McpServer({
        name: options.name,
        description: options.description,
        version: options.version
      }, {
        capabilities: { tools: {}, logging: {} }
      })
      for (const action of mountedActions) {
        server.registerTool(pascalCase(action.name), {
          title: capitalCase(action.name),
          description: action.description,
          inputSchema: action.input
        }, async (input, extra) => {
          const logger: Logger = {
            ...buildLogLevels((level, data) => {
              extra.sendNotification({ method: 'notifications/message', params: { level, data } })
            }),
            progress: ({ progress, total, message }) => {
              if (!extra._meta?.progressToken) { return }
              extra.sendNotification({
                method: 'notifications/progress',
                params: {
                  progress,
                  total,
                  message,
                  progressToken: extra._meta.progressToken
                }
              })
            }
          }
          return action.run(input, context.fork({ logger, extra })).then((result) => {
            return toolResponse(result)
          }).catch((error) => {
            if (error instanceof Error) {
              return toolResponse({ success: false, name: error.name, message: error.message, stack: error.stack })
            } else {
              return toolResponse({ success: false, name: 'Unknown Error', message: 'An unknown error occured', error })
            }
          })
        })
      }
      return server
    }

    app.get('/resource/:id', async (req: Request, res: Response) => {
      const id = req.params.id
      if (!id || typeof id !== 'string') { throw new Error('Invalid ID') }
      const resourceMeta: SideloadResource = JSON.parse(await readFile(`resources/${id}.json`, 'utf-8'))
      const buffer = await readFile(`resources/${id}`)
      res.status(200)
      res.header('Content-Type', resourceMeta.contentType)
      res.send(buffer)
    })

    app.post('/mcp', async (req: Request, res: Response) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined
      try {
        let transport: StreamableHTTPServerTransport
        if (sessionId && transports[sessionId]) {
          transport = transports[sessionId]
        } else if (!sessionId && isInitializeRequest(req.body)) {
          const eventStore = new InMemoryEventStore()
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            enableJsonResponse: false,
            eventStore,
            onsessioninitialized: (sId) => {
              console.log(`Session initialized with ID: ${sId}`)
              transports[sId] = transport
            }
          })
          transport.onerror = (error) => {
            console.error(error)
          }
          transport.onclose = () => {
            const sid = transport.sessionId
            if (sid && transports[sid]) {
              console.log(`Transport closed for session ${sid}, removing from transports map`)
              delete transports[sid]
            }
          }
          await createServer().connect(transport)
          await transport.handleRequest(req, res, req.body)
          return
        } else {
          res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32_000, message: 'Bad Request: No valid session ID provided' },
            id: null
          })
          return
        }

        // Handle the request with existing transport - no need to reconnect
        // The existing transport is already connected to the server
        await transport.handleRequest(req, res, req.body)
      } catch (error) {
        console.error('Error handling MCP request:', error)
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32_603, message: 'Internal server error' },
            id: null
          })
        }
      }
    })

    app.get('/mcp', async (req: Request, res: Response) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID')
        return
      }

      // Check for Last-Event-ID header for resumability
      const lastEventId = req.headers['last-event-id'] as string | undefined
      if (lastEventId) {
        console.log(`Client reconnecting with Last-Event-ID: ${lastEventId}`)
      } else {
        console.log(`Establishing new SSE stream for session ${sessionId}`)
      }

      const transport = transports[sessionId]
      await transport.handleRequest(req, res)
    })

    app.delete('/mcp', async (req: Request, res: Response) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID')
        return
      }

      console.log(`Received session termination request for session ${sessionId}`)

      try {
        const transport = transports[sessionId]
        await transport.handleRequest(req, res)
      } catch (error) {
        console.error('Error handling session termination:', error)
        if (!res.headersSent) {
          res.status(500).send('Error processing session termination')
        }
      }
    })

    app.get('/mcp/resource/:id', async (req: Request, res: Response) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID')
        return
      }

      // Check for Last-Event-ID header for resumability
      const lastEventId = req.headers['last-event-id'] as string | undefined
      if (lastEventId) {
        console.log(`Client reconnecting with Last-Event-ID: ${lastEventId}`)
      } else {
        console.log(`Establishing new SSE stream for session ${sessionId}`)
      }

      const transport = transports[sessionId]
      await transport.handleRequest(req, res)
    })

    let httpServer: Server | undefined
    return {
      context,
      start: async (actions) => {
        mountedActions = actions

        httpServer = app.listen(port, host, (error) => {
          if (error) {
            console.error('Failed to start server:', error)
            process.exit(1)
          }
          console.log(`MCP Streamable HTTP Server listening on http://${host}:${port}/mcp`)
        })
      },
      stop: async () => {
        if (httpServer) {
          await new Promise<void>((resolve, reject) => {
            return httpServer!.close((err) => {
              if (err) {
                reject(err)
              } else {
                resolve()
              }
            })
          })
        }
        httpServer = undefined
      }
    }
  }
}
