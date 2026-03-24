import { http } from '../src/adapter/http'
import { mcpkit } from '../src/lib/MCPKit'
import { HelloAction } from './actions/HelloAction'
import { TaskAction } from './actions/TaskAction'

async function main() {
  await mcpkit({ name: 'mcpkit', description: 'MCPKit', version: '1.0.0' })
    .with(http({ host: '127.0.0.1', port: 8080, allowedHosts: ['127.0.0.1'] }))
    .mount(HelloAction)
    .mount(TaskAction)
    .start()
}

main()
