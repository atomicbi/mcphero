import { randomUUID } from 'crypto'
import { http } from '../src/adapter/http.js'
import { mcphero } from '../src/lib/mcphero.js'
import { AdminAction } from './actions/AdminAction.js'
import { HelloAction } from './actions/HelloAction.js'
import { TaskAction } from './actions/TaskAction.js'

async function main() {
  await mcphero({ name: 'mcphero', description: 'MCPHero', version: '1.0.0' })
    .set('sessionId', randomUUID)
    .adapter(http({ host: 'localhost', port: 8080, allowedHosts: ['localhost'] }))
    .action(HelloAction)
    .action(TaskAction)
    .action(AdminAction)
    .start()
}

main()
