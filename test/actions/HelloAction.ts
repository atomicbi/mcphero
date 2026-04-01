import z from 'zod'
import { Logger } from '../../src/index.js'
import { createAction } from '../../src/util/action.js'

export interface HelloContext {
  session: string
}

export const HelloAction = createAction({
  name: 'hello',
  description: 'Say hello',
  input: z.object({
    name: z.string(),
    type: z.enum(['cat', 'dog'])
  }),
  args: ['name'],
  isEnabled: (context) => {
    const adapter = context.get<string>('adapter')
    return adapter === 'cli'
  },
  run: async ({ name, type }, context) => {
    const logger = context.get<Logger>('logger')
    const message = `Hello, ${name}, my ${type}`
    logger.info(message)
    return { message }
  }
})
