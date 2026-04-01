import z from 'zod'
import { Logger } from '../../src/index.js'
import { createAction } from '../../src/util/action.js'

export const TaskAction = createAction({
  name: 'task',
  description: 'Execute a long-running task',
  input: z.object({
    meta: z.object({
      id: z.uuid(),
      name: z.string()
    }),
    stepCount: z.number().int().min(1).max(10).describe('Number of steps to execute').default(5),
    stepDuration: z.number().int().min(1000).max(10000).describe('Time duration per step').default(1000)
  }),
  run: async ({ stepCount, stepDuration }, context) => {
    const logger = context.get<Logger>('logger')
    logger.info(`Running ${stepCount} steps at ${stepDuration}ms each`)
    for (let i = 1; i <= stepCount; i += 1) {
      logger.progress({ progress: i, total: stepCount, message: `Executing step ${i} of ${stepCount}` })
      await new Promise((resolve) => { setTimeout(resolve, stepDuration) })
    }
    return { completed: stepCount }
  }
})
