import { TextContent } from '@modelcontextprotocol/sdk/types.js'

export interface ToolResult {
  content: TextContent[]
  [x: string]: unknown
}

export function toolResponse(data: object): ToolResult {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }]
  }
}
