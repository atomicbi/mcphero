import { Action } from '../util/action.js'
import { Adapter, AdapterGenerator } from '../util/adapter.js'
import { createContext } from '../util/context.js'

export interface MCPHeroOptions {
  name: string
  description: string
  version: string
}

export interface MCPHero {
  set: <T>(key: string, value: T) => MCPHero
  adapter: (generator: AdapterGenerator) => MCPHero
  action: (action: Action) => MCPHero
  actions: (actions: Action[]) => MCPHero
  start: () => Promise<MCPHero>
}

export function mcphero(options: MCPHeroOptions): MCPHero {
  const adapters: Adapter[] = []
  const actions: Action[] = []
  const context = createContext()
  const builder: MCPHero = {
    set: (key, value) => {
      context.set(key, value)
      return builder
    },
    adapter: (generator) => {
      adapters.push(generator(options, context))
      return builder
    },
    action: (value) => {
      actions.push(value)
      return builder
    },
    actions: (values) => {
      actions.push(...values)
      return builder
    },
    start: async () => {
      await Promise.all(adapters.map((adapter) => {
        return adapter.start(actions.filter((action) => {
          if (!action.isEnabled) { return true }
          return action.isEnabled(adapter.context)
        }))
      }))
      return builder
    }
  }
  return builder
}
