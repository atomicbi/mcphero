import { mcphero } from '@mcphero/core'
import { vercel } from '@mcphero/vercel'
import { Redis } from '@upstash/redis'
import { createRedisStore, google } from '../../../packages/auth/build/index.js'
import { CalculateAction } from '../actions/calculate.js'
import { GreetAction } from '../actions/greet.js'

const { adapter, handler } = vercel({
  auth: google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    resourceUrl: 'http://localhost:8080',
    redirectUris: ['http://localhost:*', 'http://127.0.0.1:*', 'https://claude.ai/*', 'https://app.mcpjam.com/*', 'mcpjam://*'],
    requiredScopes: ['openid', 'https://www.googleapis.com/auth/userinfo.email'],
    callbackPath: '/auth/callback',
    signingKey: 'c937130a-73d9-4c12-96bf-b12d70867685',
    store: createRedisStore({ client: Redis.fromEnv() })
  })
})

await mcphero({ name: 'mcphero-demo', description: 'MCPHero Vercel Demo', version: '1.0.0', })
  .adapter(adapter)
  .action(GreetAction)
  .action(CalculateAction)
  .start()

export default { fetch: handler }
