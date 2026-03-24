import { cli } from '../src/adapter/cli'
import { mcpkit } from '../src/lib/MCPKit'
import { HelloAction } from './actions/HelloAction'
import { TaskAction } from './actions/TaskAction'

async function main() {
  await mcpkit({ name: 'mcpkit', description: 'MCPKit', version: '1.0.0' })
    .with(cli())
    .mount(HelloAction)
    .mount(TaskAction)
    .start()
}

main()
