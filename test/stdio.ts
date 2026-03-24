import { stdio } from '../src/adapter/stdio.js'
import { mcphero } from '../src/index.js'
import { HelloAction } from './actions/HelloAction.js'
import { TaskAction } from './actions/TaskAction.js'

async function main() {
  await mcphero({ name: 'mcphero', description: 'MCPHero', version: '1.0.0' })
    .with(stdio())
    .mount(HelloAction)
    .mount(TaskAction)
    .start()
}

main()
