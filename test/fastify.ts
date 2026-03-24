import { fastify } from '../src/adapter/fastify.js'
import { mcphero } from '../src/index.js'
import { HelloAction } from './actions/HelloAction.js'
import { TaskAction } from './actions/TaskAction.js'

async function main() {
  await mcphero({ name: 'mcphero', description: 'MCPHero', version: '1.0.0' })
    .with(fastify({ host: 'localhost', port: 8080, logger: true }))
    .mount(HelloAction)
    .mount(TaskAction)
    .start()
}

main()
