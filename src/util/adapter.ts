import { MCPHeroOptions } from '../lib/mcphero.js'
import { Action } from './action.js'
import { MCPHeroContext } from './context.js'

export interface Adapter {
  context: MCPHeroContext
  start(actions: Action[]): Promise<void>
  stop(): Promise<void>
}

export type AdapterGenerator = (options: MCPHeroOptions, baseContext: MCPHeroContext) => Adapter

export type AdapterFactory<T = void> = (options: T) => AdapterGenerator
