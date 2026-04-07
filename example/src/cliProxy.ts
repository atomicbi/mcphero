import { mcphero } from '@mcphero/core'
import { cliProxy } from '@mcphero/mcp'
import { HelloAction } from './actions/HelloAction.js'
import { TaskAction } from './actions/TaskAction.js'

async function main() {
  await mcphero({ name: 'mcphero', description: 'MCPHero', version: '1.0.0' })
    .adapter(cliProxy({ url: new URL('http://localhost:8080/mcp') }))
    .action(HelloAction)
    .action(TaskAction)
    .start()
}

main()
