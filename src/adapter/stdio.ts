import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { capitalCase, pascalCase } from 'change-case'
import { ActionContext } from '../util/action.js'
import { AdapterFactory } from '../util/adapter.js'
import { buildLogLevels } from '../util/logger.js'
import { toolResponse } from '../util/mcp.js'

export const stdio: AdapterFactory = () => {
  return (options) => {
    const server = new McpServer({
      name: options.name,
      description: options.description,
      version: options.version
    }, {
      capabilities: { tools: {}, logging: {} }
    })
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
        const transport = new StdioServerTransport()
        await server.connect(transport)
      },
      stop: async () => {
        await server?.close()
      }
    }
  }
}
