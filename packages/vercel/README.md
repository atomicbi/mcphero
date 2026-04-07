# @mcphero/vercel

Vercel serverless adapter for [MCPHero](https://github.com/atomicbi/mcphero) — deploy your actions as a stateless MCP server on Vercel.

## Install

```bash
pnpm add @mcphero/core @mcphero/vercel
```

## Usage

### Vanilla Vercel Functions

```typescript
// api/mcp.ts
import { mcphero } from '@mcphero/core'
import { vercel } from '@mcphero/vercel'
import { MyAction } from '../actions/my-action.js'

const { adapter, handler } = vercel()

await mcphero({ name: 'my-tools', description: 'My MCP Server', version: '1.0.0' })
  .adapter(adapter)
  .action(MyAction)
  .start()

export default { fetch: handler }
```

### Next.js App Router

```typescript
// app/api/mcp/route.ts
import { mcphero } from '@mcphero/core'
import { vercel } from '@mcphero/vercel'
import { MyAction } from '../../../actions/my-action.js'

const { adapter, GET, POST, DELETE } = vercel()

await mcphero({ name: 'my-tools', description: 'My MCP Server', version: '1.0.0' })
  .adapter(adapter)
  .action(MyAction)
  .start()

export { GET, POST, DELETE }
```

## How It Works

- Uses `WebStandardStreamableHTTPServerTransport` from the MCP SDK in **stateless mode** (`sessionIdGenerator: undefined`)
- Each request creates a fresh `McpServer` + transport, registers tools, handles the request, and returns a Web Standard `Response`
- Actions are registered as MCP tools using `PascalCase` names (same as the stdio and http adapters)
- Logging goes to `process.stderr` (Vercel log drain) and MCP client notifications

## Options

```typescript
const { adapter, handler } = vercel({
  enableJsonResponse: true  // Return JSON instead of SSE streams
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableJsonResponse` | `boolean` | `false` | Return JSON responses instead of SSE streams |

## Compound Return Pattern

Unlike other MCPHero adapters that are simple `AdapterFactory` functions, `vercel()` returns a compound object:

```typescript
interface VercelAdapter {
  adapter: AdapterGenerator                      // Pass to mcphero().adapter()
  handler: (request: Request) => Promise<Response>  // The request handler
  GET: (request: Request) => Promise<Response>      // Alias for handler
  POST: (request: Request) => Promise<Response>     // Alias for handler
  DELETE: (request: Request) => Promise<Response>    // Alias for handler
}
```

This is because Vercel functions export request handlers rather than starting long-lived servers. The `adapter` property integrates with the MCPHero builder, while `handler`/`GET`/`POST`/`DELETE` are exported from your route file.

## Deployment

### Vercel Configuration

```json
{
  "framework": null,
  "functions": {
    "api/mcp.ts": {
      "memory": 1024,
      "maxDuration": 60
    }
  },
  "rewrites": [
    { "source": "/mcp", "destination": "/api/mcp" }
  ]
}
```

### CORS

CORS is not handled by the adapter. Use Next.js middleware or Vercel headers configuration:

```json
{
  "headers": [
    {
      "source": "/api/mcp",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, DELETE, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Mcp-Session-Id" }
      ]
    }
  ]
}
```

## See Also

- [MCPHero README](https://github.com/atomicbi/mcphero) — Full documentation
- [`@mcphero/core`](https://www.npmjs.com/package/@mcphero/core) — Core library
- [`@mcphero/mcp`](https://www.npmjs.com/package/@mcphero/mcp) — MCP stdio and HTTP adapters (stateful)
