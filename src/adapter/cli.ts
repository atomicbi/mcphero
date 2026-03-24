import { intro, log } from '@clack/prompts'
import { camelCase, kebabCase } from 'change-case'
import { Command } from 'commander'
import z from 'zod'
import { ActionContext } from '../util/action.js'
import { AdapterFactory } from '../util/adapter.js'
import { unwrap } from '../util/zod.js'

export const cli: AdapterFactory = () => {
  return (options) => {
    const program = new Command()
      .name(options.name)
      .description(options.description)
      .version(options.version)

    return {
      start: async (actions) => {
        for (const action of actions) {
          const name = kebabCase(action.name)
          const command = program.command(name).description(action.description)
          const shape = action.input.shape
          const keys = Object.keys(shape)
          for (const key of keys) {
            const [type, { defaultValue }] = unwrap(shape[key])
            const description = type.description
            const isArgument = action.args?.includes(key)
            if (isArgument) {
              command.argument(`[${camelCase(key)}]`, description, defaultValue)
            } else {
              if (type instanceof z.ZodBoolean) {
                command.option(`--${kebabCase(key)}`, description, defaultValue)
                command.option(`--no-${kebabCase(key)}`)
              } else if (type instanceof z.ZodNumber) {
                command.option(
                  `--${kebabCase(key)} <number>`,
                  description,
                  defaultValue
                )
              } else if (type instanceof z.ZodString) {
                command.option(
                  `--${kebabCase(key)} <string>`,
                  description,
                  defaultValue
                )
              } else if (type instanceof z.ZodRecord) {
                command.option(`--${kebabCase(key)} <json>`, description, defaultValue)
              } else {
                throw new Error(`Invalid zod type: ${type.def.type}`)
              }
            }
            command.action((...args) => {
              const toString = (value: unknown) => {
                return typeof value === 'string' ? value : JSON.stringify(value)
              }
              const context: ActionContext = {
                logger: {
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
              const rawInput = args.at(-2)
              const input = action.input.parse(rawInput)
              action.args?.forEach((k, index) => {
                input[k] = args[index]
              })
              intro(`${options.name} - ${action.name}`)
              action.run(input, context).catch((error) => {
                if (error instanceof Error) {
                  console.error(error.message)
                } else {
                  throw new Error(error)
                }
                process.exit()
              })
            })
          }
        }
        program.parse()
      },
      stop: async () => { }
    }
  }
}
