import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js'
import { createMcpExpressApp, CreateMcpExpressAppOptions } from '@modelcontextprotocol/sdk/server/express.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { capitalCase, pascalCase } from 'change-case'
import cors from 'cors'
import { randomUUID } from 'crypto'
import { Request, Response } from 'express'
import { Server } from 'http'
import { ActionContext } from '../util/action.js'
import { AdapterFactory } from '../util/adapter.js'
import { buildLogLevels } from '../util/logger.js'
import { toolResponse } from '../util/mcp.js'

export interface HttpAdapterOptions extends CreateMcpExpressAppOptions {
  host: string
  port: number
}

export const http: AdapterFactory<HttpAdapterOptions> = ({ host, port, ...mcpOptions }) => {
  return (options) => {
    const server = new McpServer({
      name: options.name,
      description: options.description,
      version: options.version
    }, {
      capabilities: { tools: {}, logging: {} }
    })
    const app = createMcpExpressApp({ ...mcpOptions, host })
    app.use(cors({ exposedHeaders: ['WWW-Authenticate', 'Mcp-Session-Id', 'Last-Event-Id', 'Mcp-Protocol-Version'], origin: '*' }))
    const transports: Record<string, StreamableHTTPServerTransport> = {}
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
          transport.onclose = () => {
            const sid = transport.sessionId
            if (sid && transports[sid]) {
              console.log(`Transport closed for session ${sid}, removing from transports map`)
              delete transports[sid]
            }
          }
          await server.connect(transport)
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

    let httpServer: Server | undefined
    return {
      start: async (actions) => {
        for (const action of actions) {
          server.registerTool(pascalCase(action.name), {
            title: capitalCase(action.name),
            description: action.description,
            inputSchema: action.input
          }, async (input, { sendNotification, _meta }) => {
            const context: ActionContext = {
              logger: {
                ...buildLogLevels((level, data) => {
                  sendNotification({ method: 'notifications/message', params: { level, data } })
                }),
                progress: ({ progress, total, message }) => {
                  if (!_meta?.progressToken) { return }
                  sendNotification({
                    method: 'notifications/progress',
                    params: {
                      progress,
                      total,
                      message,
                      progressToken: _meta.progressToken
                    }
                  })
                }
              }
            }
            return action.run(input, context).then((result) => {
              return toolResponse(result)
            }).catch((error) => {
              if (error instanceof Error) {
                return toolResponse({
                  success: false,
                  name: error.name,
                  message: error.message,
                  stack: error.stack
                })
              } else {
                return toolResponse({
                  success: false,
                  name: 'Unknown Error',
                  message: 'An unknown error occured',
                  error
                })
              }
            })
          })
        }

        httpServer = app.listen(port, host, (error) => {
          if (error) {
            console.error('Failed to start server:', error)
            process.exit(1)
          }
          console.log(`MCP Streamable HTTP Server listening on port ${port}`)
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
