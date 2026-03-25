/* eslint-disable @typescript-eslint/no-explicit-any */
import { log } from '@clack/prompts'
import z from 'zod'
import { Action } from './action.js'
import { Logger } from './logger.js'

export function handleCLIError(error: unknown) {
  if (error instanceof z.ZodError) {
    log.error('Validation Error', { withGuide: false })
    for (const issue of error.issues) {
      log.error(`${issue.path}: ${issue.message}`)
    }
  } else if (error instanceof Error) {
    log.error(error.message)
  } else if (typeof error === 'string') {
    log.error(error)
  } else {
    log.error(JSON.stringify(error))
  }
}

export function parseCLIInput(action: Action, args: any[]) {
  const tmpArgs = args.slice(0, -1)
  const rawInput = tmpArgs.pop()
  action.args?.forEach((k, index) => { rawInput[k] = args[index] })
  const { error, data } = action.input.safeParse(rawInput)
  if (error || !data) {
    handleCLIError(error)
    process.exit()
  }

  return data
}

export function buildCLILogger(): Logger {
  const toString = (value: unknown) => typeof value === 'string' ? value : JSON.stringify(value)
  return {
    error: (data) => { log.error(toString(data)) },
    debug: (data) => { log.message(toString(data)) },
    info: (data) => { log.info(toString(data)) },
    notice: (data) => { log.message(toString(data)) },
    warning: (data) => { log.warn(toString(data)) },
    critical: (data) => { log.error(toString(data)) },
    alert: (data) => { log.error(toString(data)) },
    emergency: (data) => { log.error(toString(data)) },
    progress: ({ progress, total, message }) => {
      console.info({ progress, total, message })
    }
  }
}
