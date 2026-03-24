import { http } from '../src/adapter/http.js'
import { mcphero } from '../src/lib/mcphero.js'
import { HelloAction } from './actions/HelloAction.js'
import { TaskAction } from './actions/TaskAction.js'

async function main() {
  await mcphero({ name: 'mcphero', description: 'MCPHero', version: '1.0.0' })
    .with(http({ host: '127.0.0.1', port: 8080, allowedHosts: ['127.0.0.1'] }))
    .mount(HelloAction)
    .mount(TaskAction)
    .start()
}

main()
