// import { MCPHeroOptions } from '../lib/MCPHero.js'
import { MCPHeroOptions } from '../lib/mcphero.js'
import { Action } from './action.js'

export interface Adapter {
  start(actions: Action[]): Promise<void>
  stop(): Promise<void>
}

export type AdapterGenerator = (options: MCPHeroOptions) => Adapter

export type AdapterFactory<T = void> = (options: T) => AdapterGenerator
