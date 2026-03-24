import { Action } from '../util/action.js'
import { Adapter, AdapterGenerator } from '../util/adapter.js'

export interface MCPKitOptions {
  name: string
  description: string
  version: string
}

export interface MCPKit {
  with: (generator: AdapterGenerator) => MCPKit
  mount: (action: Action) => MCPKit
  start: () => Promise<MCPKit>
}

export function mcpkit(options: MCPKitOptions): MCPKit {
  const adapters: Adapter[] = []
  const actions: Action[] = []
  const instance: MCPKit = {
    with: (generator) => {
      adapters.push(generator(options))
      return instance
    },
    mount: (action) => {
      actions.push(action)
      return instance
    },
    start: async () => {
      await Promise.all(adapters.map((adapter) => adapter.start(actions)))
      return instance
    }
  }
  return instance
}
