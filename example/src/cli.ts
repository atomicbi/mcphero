import { AdminAction } from '../actions/AdminAction.js'
import { HelloAction } from '../actions/HelloAction.js'
import { TaskAction } from '../actions/TaskAction.js'
import { cli } from './adapter/cli.js'
import { mcphero } from './lib/mcphero.js'

async function main() {
  await mcphero({ name: 'mcphero', description: 'MCPHero', version: '1.0.0' })
    .set('userId', 'toby')
    .set('role', 'admin')
    .adapter(cli())
    .action(HelloAction)
    .action(TaskAction)
    .action(AdminAction)
    .start()
}

main()
