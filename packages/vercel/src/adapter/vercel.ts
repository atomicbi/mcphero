import { Action, AdapterGenerator, MCPHeroContext, MCPHeroOptions, toolResponse } from '@mcphero/core'
import { createLogger } from '@mcphero/logger'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { capitalCase, pascalCase } from 'change-case'

export interface VercelAdapterOptions {
  enableJsonResponse?: boolean
}

export interface VercelAdapter {
  adapter: AdapterGenerator
  handler: (request: Request) => Promise<Response>
  GET: (request: Request) => Promise<Response>
  POST: (request: Request) => Promise<Response>
  DELETE: (request: Request) => Promise<Response>
}

export function vercel(options: VercelAdapterOptions = {}): VercelAdapter {
  let _actions: Action[] = []
  let _options: MCPHeroOptions | null = null
  let _context: MCPHeroContext | null = null
  let _readyResolve: () => void
  const _ready = new Promise<void>((resolve) => {
    _readyResolve = resolve
  })

  const handleRequest = async (request: Request): Promise<Response> => {
    await _ready

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: options.enableJsonResponse
    })

    const server = new McpServer({
      name: _options!.name,
      description: _options!.description,
      version: _options!.version
    }, {
      capabilities: { tools: {}, logging: {} }
    })

    for (const action of _actions) {
      server.registerTool(pascalCase(action.name), {
        title: capitalCase(action.name),
        description: action.description,
        inputSchema: action.input
      }, async (input, extra) => {
        const logger = createLogger({
          stream: process.stderr,
          onLog: (level, data) => {
            extra.sendNotification({ method: 'notifications/message', params: { level, data } })
          },
          onProgress: ({ progress, total, message }) => {
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
        })
        return action.run(input, _context!.fork({ logger, extra })).then((result) => {
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

    await server.connect(transport)
    return transport.handleRequest(request)
  }

  const adapter: AdapterGenerator = (mcpHeroOptions: MCPHeroOptions, baseContext: MCPHeroContext) => {
    _options = mcpHeroOptions
    _context = baseContext.fork({ adapter: 'vercel' })
    return {
      context: _context,
      start: async (actions) => {
        _actions = actions
        _readyResolve()
      },
      stop: async () => {
        _actions = []
      }
    }
  }

  return {
    adapter,
    handler: handleRequest,
    GET: handleRequest,
    POST: handleRequest,
    DELETE: handleRequest
  }
}
