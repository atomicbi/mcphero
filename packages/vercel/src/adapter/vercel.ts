import { AuthConfig, generateProtectedResourceMetadata, OAuthRequest, validateToken } from '@mcphero/auth'
import { Action, AdapterGenerator, MCPHeroContext, MCPHeroOptions, toolResponse } from '@mcphero/core'
import { createLogger } from '@mcphero/logger'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { capitalCase, pascalCase } from 'change-case'

export interface VercelAdapterOptions {
  enableJsonResponse?: boolean
  auth?: AuthConfig
}

export interface VercelAdapter {
  adapter: AdapterGenerator
  handler: (request: Request) => Promise<Response>
  GET: (request: Request) => Promise<Response>
  POST: (request: Request) => Promise<Response>
  DELETE: (request: Request) => Promise<Response>
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400'
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

    const url = new URL(request.url)

    if (options.auth?.authorizationServers?.length && options.auth.resourceUrl) {
      if (url.pathname === '/.well-known/oauth-protected-resource' || url.pathname.endsWith('/.well-known/oauth-protected-resource')) {
        if (request.method === 'OPTIONS') {
          return new Response(null, { status: 200, headers: CORS_HEADERS })
        }
        const metadata = generateProtectedResourceMetadata(options.auth.resourceUrl, options.auth.authorizationServers)
        return new Response(JSON.stringify(metadata), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'max-age=3600' }
        })
      }
    }

    if (options.auth?.provider) {
      const provider = options.auth.provider
      const oauthPaths: Record<string, string[]> = {
        '/.well-known/oauth-authorization-server': ['GET'],
        '/authorize': ['GET'],
        '/auth/callback': ['GET'],
        '/token': ['POST'],
        '/register': ['POST']
      }
      const match = Object.entries(oauthPaths).find(([path]) => url.pathname === path || url.pathname.endsWith(path))
      if (match) {
        const [, methods] = match
        if (request.method === 'OPTIONS') {
          return new Response(null, { status: 200, headers: CORS_HEADERS })
        }
        if (!methods.includes(request.method)) {
          return new Response('Method not allowed', { status: 405 })
        }
        const toOAuthReq = async (): Promise<OAuthRequest> => {
          let body: Record<string, string> | undefined
          if (request.method === 'POST') {
            const contentType = request.headers.get('content-type') ?? ''
            const text = await request.text()
            if (contentType.includes('json')) {
              body = JSON.parse(text)
            } else {
              body = Object.fromEntries(new URLSearchParams(text))
            }
          }
          return {
            method: request.method,
            url,
            headers: Object.fromEntries(request.headers.entries()),
            body
          }
        }
        const oauthReq = await toOAuthReq()
        let oauthRes
        if (url.pathname.endsWith('/.well-known/oauth-authorization-server')) {
          oauthRes = provider.metadata()
        } else if (url.pathname.endsWith('/authorize')) {
          oauthRes = await provider.authorize(oauthReq)
        } else if (url.pathname.endsWith('/auth/callback')) {
          oauthRes = await provider.callback(oauthReq)
        } else if (url.pathname.endsWith('/token')) {
          oauthRes = await provider.token(oauthReq)
        } else {
          oauthRes = await provider.register(oauthReq)
        }
        const responseBody = oauthRes.body ? (typeof oauthRes.body === 'string' ? oauthRes.body : JSON.stringify(oauthRes.body)) : null
        return new Response(responseBody, { status: oauthRes.status, headers: oauthRes.headers })
      }
    }

    let requestContext = _context!
    if (options.auth) {
      const result = await validateToken(request.headers.get('authorization'), options.auth)
      if (result.error) {
        return new Response(JSON.stringify(result.error.body), {
          status: result.error.statusCode,
          headers: result.error.headers
        })
      }
      if (result.auth) {
        requestContext = _context!.fork({ auth: result.auth })
      }
    }

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
        return action.run(input, requestContext.fork({ logger, extra })).then((result) => {
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
