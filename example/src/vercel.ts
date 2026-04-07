// Example: Vercel/Next.js App Router route handler
// File would be at: app/api/mcp/route.ts in a Next.js project

import { mcphero } from '@mcphero/core'
import { vercel } from '@mcphero/vercel'
import { HelloAction } from './actions/HelloAction.js'
import { TaskAction } from './actions/TaskAction.js'

const { adapter, GET, POST, DELETE } = vercel()

await mcphero({ name: 'mcphero', description: 'MCPHero', version: '1.0.0' })
  .adapter(adapter)
  .action(HelloAction)
  .action(TaskAction)
  .start()

export { GET, POST, DELETE }
