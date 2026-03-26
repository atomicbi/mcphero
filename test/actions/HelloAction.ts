import z from 'zod'
import { createAction } from '../../src/util/action.js'

export const HelloAction = createAction({
  name: 'hello',
  description: 'Say hello',
  input: z.object({
    name: z.string(),
    type: z.enum(['cat', 'dog'])
  }),
  args: ['name'],
  run: async ({ name, type }, { logger }) => {
    const message = `Hello, ${name}, my ${type}`
    logger.info(message)
    return { message }
  }
})
