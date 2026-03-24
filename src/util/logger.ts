export interface MessageOptions {
  message: string
}

export interface ProgressOptions {
  progress: number
  total?: number
  message?: string
}

const LogLevels = ['error', 'debug', 'info', 'notice', 'warning', 'critical', 'alert', 'emergency'] as const

export type LogLevel = typeof LogLevels[number]

export type LogFn = (data: unknown) => void

export interface Logger extends Record<LogLevel, LogFn> {
  progress: (options: ProgressOptions) => void
}

export function buildLogLevels(fn: (level: LogLevel, data: unknown) => void): Record<LogLevel, LogFn> {
  return Object.fromEntries(LogLevels.map((level) => [level, (data) => { fn(level, data) }])) as Record<LogLevel, LogFn>
}
