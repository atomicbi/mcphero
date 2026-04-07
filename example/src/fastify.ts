import { mcphero } from '@mcphero/core'
import { fastify } from '@mcphero/fastify'
import { HelloAction } from './actions/HelloAction.js'
import { TaskAction } from './actions/TaskAction.js'

async function main() {
  await mcphero({ name: 'mcphero', description: 'MCPHero', version: '1.0.0' })
    .adapter(fastify({ host: 'localhost', port: 8080, logger: true }))
    .action(HelloAction)
    .action(TaskAction)
    .start()
}

main()
