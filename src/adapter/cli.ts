import { intro } from '@clack/prompts'
import { camelCase, kebabCase } from 'change-case'
import { Command } from 'commander'
import z from 'zod'
import { AdapterFactory } from '../util/adapter.js'
import { buildCLILogger, handleCLIError, parseCLIInput } from '../util/cli.js'
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
              } else if (type instanceof z.ZodEnum) {
                command.option(`--${kebabCase(key)} <string>`, description, defaultValue)
              } else {
                throw new Error(`Invalid zod type: ${type.def.type}`)
              }
            }
          }
          command.action((...args) => {
            const logger = buildCLILogger()
            const input = parseCLIInput(action, args)
            intro(`${options.name} - ${action.name}`)
            action.run(input, { logger }).then((result) => {
              logger.info(JSON.stringify(result, null, 2))
            }).catch(handleCLIError)
          })
        }
        program.parse()
      },
      stop: async () => { }
    }
  }
}
