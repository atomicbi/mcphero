import { createRedisStore, google } from '@mcphero/auth'
import { mcphero } from '@mcphero/core'
import { vercel } from '@mcphero/vercel'
import { Redis } from '@upstash/redis'
import { CalculateAction } from '../actions/calculate.js'
import { GreetAction } from '../actions/greet.js'

const { adapter, handler } = vercel({
  auth: google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    resourceUrl: process.env.BASE_URL!,
    redirectUris: [
      'https://claude.ai/*',
      `${process.env.BASE_URL!}/*`,
      'http://localhost:*',
      'http://127.0.0.1:*',
      'https://app.mcpjam.com/*',
      'mcpjam://*'
    ],
    requiredScopes: ['openid', 'email'],
    callbackPath: '/auth/callback',
    signingKey: process.env.SIGNING_KEY!,
    store: createRedisStore({ client: new Redis({ url: process.env.UPSTASH_KV_REST_API_URL!, token: process.env.UPSTASH_KV_REST_API_TOKEN! }) })
  })
})

await mcphero({ name: 'mcphero-demo', description: 'MCPHero Vercel Demo', version: '1.0.0' })
  .adapter(adapter)
  .action(GreetAction)
  .action(CalculateAction)
  .start()

export default { fetch: handler }
