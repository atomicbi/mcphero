import { AdapterFactory } from '@mcphero/core'
import { buildLogLevels, Logger, LogLevel } from '@mcphero/logger'
import { FastifyBaseLogger, FastifyHttpOptions, fastify as fastifyInstance } from 'fastify'
import { Server } from 'http'

type FastifyLogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'

const PINO_LEVEL_MAP: Record<LogLevel, FastifyLogLevel> = {
  emergency: 'fatal',
  alert: 'fatal',
  critical: 'fatal',
  error: 'error',
  warning: 'warn',
  notice: 'debug',
  info: 'info',
  debug: 'debug'
}

export interface FastifyAdapterOptions extends FastifyHttpOptions<Server, FastifyBaseLogger> {
  host?: string
  port?: number
}

export const fastify: AdapterFactory<FastifyAdapterOptions> = ({ host, port, ...fastifyOptions }) => {
  const instance = fastifyInstance(fastifyOptions)
  return (options, baseContext) => {
    const context = baseContext.fork({ adapter: 'fastify' })
    return {
      context,
      start: async (actions) => {
        await instance.register(import('@fastify/swagger'), {
          openapi: {
            info: {
              title: options.name,
              description: options.description,
              version: options.version
            }
          }
        })
        await instance.register(import('@scalar/fastify-api-reference'), { routePrefix: '/' as `/${string}` })
        for (const action of actions) {
          const schema = action.input.toJSONSchema()
          instance.post(`/${action.name}`, {
            schema: {
              description: action.description,
              body: {
                type: 'object',
                properties: schema.properties,
                required: schema.required
              },
              response: {
                200: { description: 'Successful response' }
              }
            }
          }, (request) => {
            const logger: Logger = {
              ...buildLogLevels((level, data) => {
                const pinoLevel = PINO_LEVEL_MAP[level] ?? 'info'
                instance.log[pinoLevel](data)
              }),
              progress: ({ progress, total, message }) => { instance.log.trace({ progress, total }, message) }
            }
            return action.run(request.body, context.fork({ logger, request }))
          })
        }
        await instance.listen({ host, port })
      },
      stop: async () => { await instance.close() }
    }
  }
}
