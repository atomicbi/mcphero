import { cliProxy } from '../src/adapter/cliProxy.js'
import { mcphero } from '../src/lib/mcphero.js'
import { HelloAction } from './actions/HelloAction.js'
import { TaskAction } from './actions/TaskAction.js'

async function main() {
  await mcphero({ name: 'mcphero', description: 'MCPHero', version: '1.0.0' })
    .with(cliProxy({ url: new URL('http://localhost:8080/mcp') }))
    .mount(HelloAction)
    .mount(TaskAction)
    .start()
}

main()
