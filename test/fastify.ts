import { fastify } from '../src/adapter/fastify'
import { mcpkit } from '../src/lib/MCPKit'
import { HelloAction } from './actions/HelloAction'
import { TaskAction } from './actions/TaskAction'

async function main() {
  await mcpkit({ name: 'mcpkit', description: 'MCPKit', version: '1.0.0' })
    .with(fastify({ host: 'localhost', port: 8080, logger: true }))
    .mount(HelloAction)
    .mount(TaskAction)
    .start()
}

main()
