import { stdio } from '../src/adapter/stdio'
import { mcpkit } from '../src/lib/MCPKit'
import { HelloAction } from './actions/HelloAction'
import { TaskAction } from './actions/TaskAction'

async function main() {
  await mcpkit({ name: 'mcpkit', description: 'MCPKit', version: '1.0.0' })
    .with(stdio())
    .mount(HelloAction)
    .mount(TaskAction)
    .start()
}

main()
