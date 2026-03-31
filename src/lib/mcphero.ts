import { Action } from '../util/action.js'
import { Adapter, AdapterGenerator } from '../util/adapter.js'

export interface MCPHeroOptions {
  name: string
  description: string
  version: string
}

export interface MCPHero {
  with: (generator: AdapterGenerator) => MCPHero
  mount: (action: Action) => MCPHero
  mountAll: (actions: Action[]) => MCPHero
  start: () => Promise<MCPHero>
}

export function mcphero(options: MCPHeroOptions): MCPHero {
  const adapters: Adapter[] = []
  const actions: Action[] = []
  const instance: MCPHero = {
    with: (generator) => {
      adapters.push(generator(options))
      return instance
    },
    mount: (value) => {
      actions.push(value)
      return instance
    },
    mountAll: (values) => {
      actions.push(...values)
      return instance
    },
    start: async () => {
      await Promise.all(adapters.map((adapter) => adapter.start(actions)))
      return instance
    }
  }
  return instance
}
