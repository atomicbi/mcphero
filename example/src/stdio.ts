import { mcphero } from '@mcphero/core'
import { stdio } from '@mcphero/mcp'
import { HelloAction } from './actions/HelloAction.js'
import { TaskAction } from './actions/TaskAction.js'

async function main() {
  await mcphero({ name: 'mcphero', description: 'MCPHero', version: '1.0.0' })
    .adapter(stdio())
    .action(HelloAction)
    .action(TaskAction)
    .start()
}

main()
