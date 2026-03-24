/* eslint-disable @typescript-eslint/no-explicit-any */
import z from 'zod'
import { Logger } from './logger.js'

export interface ActionContext {
  logger: Logger
}

export interface Action<I extends object = any, O extends object = any> {
  name: string
  description: string
  input: z.ZodType<I> & { shape: Record<string, z.ZodTypeAny> }
  args?: (keyof I)[]
  run: (input: I, context: ActionContext) => Promise<O>
}

export function createAction<I extends object, O extends object>(
  action: Action<I, O>
): Action<I, O> {
  return action
}
