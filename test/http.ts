import { http } from '../src/adapter/http.js'
import { mcphero } from '../src/lib/mcphero.js'
import { HelloAction } from './actions/HelloAction.js'
import { TaskAction } from './actions/TaskAction.js'

async function main() {
  await mcphero({ name: 'mcphero', description: 'MCPHero', version: '1.0.0' })
    .with(http({ host: 'localhost', port: 8080, allowedHosts: ['localhost'] }))
    .mount(HelloAction)
    .mount(TaskAction)
    .start()
}

main()
