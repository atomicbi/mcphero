import { FastifyBaseLogger, FastifyHttpOptions, fastify as fastifyInstance } from 'fastify'
import { Server } from 'http'
import { AdapterFactory } from '../util/adapter.js'

export interface FastifyAdapterOptions extends FastifyHttpOptions<Server, FastifyBaseLogger> {
  host?: string
  port?: number
}

export const fastify: AdapterFactory<FastifyAdapterOptions> = ({ host, port, ...fastifyOptions }) => {
  const instance = fastifyInstance(fastifyOptions)
  const logger = instance.log
  return (options) => {
    return {
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
          }, (request) => action.run(request.body, {
            logger: {
              error: (data) => { logger.error(data) },
              debug: (data) => { logger.debug(data) },
              info: (data) => { logger.info(data) },
              notice: (data) => { logger.debug(data) },
              warning: (data) => { logger.warn(data) },
              critical: (data) => { logger.fatal(data) },
              alert: (data) => { logger.error(data) },
              emergency: (data) => { logger.fatal(data) },
              progress: ({ progress, total, message }) => { logger.trace({ progress, total }, message) }
            }
          }))
        }
        await instance.listen({ host, port })
      },
      stop: async () => { await instance.close() }
    }
  }
}
