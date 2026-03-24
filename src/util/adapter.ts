// import { MCPKitOptions } from '../lib/MCPKit.js'
import { MCPKitOptions } from '../lib/mcpkit.js'
import { Action } from './action.js'

export interface Adapter {
  start(actions: Action[]): Promise<void>
  stop(): Promise<void>
}

export type AdapterGenerator = (options: MCPKitOptions) => Adapter

export type AdapterFactory<T = void> = (options: T) => AdapterGenerator
