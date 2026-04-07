import { mcphero } from '@mcphero/core'
import { vercel } from '@mcphero/vercel'
import { GreetAction } from '../actions/greet.js'
import { CalculateAction } from '../actions/calculate.js'

const { adapter, handler } = vercel()

await mcphero({ name: 'mcphero-demo', description: 'MCPHero Vercel Demo', version: '1.0.0' })
  .adapter(adapter)
  .action(GreetAction)
  .action(CalculateAction)
  .start()

export default { fetch: handler }
