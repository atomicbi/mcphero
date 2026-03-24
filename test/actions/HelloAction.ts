import z from 'zod'
import { createAction } from '../../src/util/action'

export const HelloAction = createAction({
  name: 'hello',
  description: 'Say hello',
  input: z.object({ name: z.string().describe('Name') }),
  run: async ({ name }, { logger }) => {
    const message = `Hello, ${name}`
    logger.info(message)
    return { message }
  }
})
