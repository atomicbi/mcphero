import { FastifyBaseLogger, FastifyHttpOptions, fastify as fastifyInstance } from 'fastify'
import { Server } from 'http'
import { AdapterFactory } from '../util/adapter.js'
import { Logger } from '../util/logger.js'

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
              error: (data) => { instance.log.error(data) },
              debug: (data) => { instance.log.debug(data) },
              info: (data) => { instance.log.info(data) },
              notice: (data) => { instance.log.debug(data) },
              warning: (data) => { instance.log.warn(data) },
              critical: (data) => { instance.log.fatal(data) },
              alert: (data) => { instance.log.error(data) },
              emergency: (data) => { instance.log.fatal(data) },
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
