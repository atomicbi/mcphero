# @mcphero/fastify

Fastify REST adapter for [MCPHero](https://github.com/atomicbi/mcphero) — expose your actions as a REST API with auto-generated OpenAPI/Swagger documentation.

## Install

```bash
pnpm add @mcphero/core @mcphero/fastify
```

## Usage

```typescript
import { mcphero } from '@mcphero/core'
import { fastify } from '@mcphero/fastify'
import { SearchAction } from './actions/search.js'

await mcphero({ name: 'my-api', description: 'My REST API', version: '1.0.0' })
  .adapter(fastify({ host: 'localhost', port: 8080, logger: true }))
  .action(SearchAction)
  .start()
```

Visit `http://localhost:8080/` for the interactive Scalar API reference.

## Route Mapping

Each action becomes a `POST /{action.name}` route. Zod schemas are converted to JSON Schema for request body validation and OpenAPI documentation.

| Action | Route | Body |
|--------|-------|------|
| `name: 'search'` | `POST /search` | `{ "query": "...", "limit": 10 }` |
| `name: 'greet'` | `POST /greet` | `{ "name": "World" }` |

## Options

`FastifyAdapterOptions` extends Fastify's native `FastifyHttpOptions`, so any Fastify config is supported:

```typescript
fastify({
  host: 'localhost',
  port: 8080,
  logger: {
    level: 'debug',
    transport: { target: 'pino-pretty' }
  },
  connectionTimeout: 30000
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | `string` | `undefined` | Bind address |
| `port` | `number` | `undefined` | Listen port |
| *...* | | | Any `FastifyHttpOptions` |

## See Also

- [MCPHero README](https://github.com/atomicbi/mcphero) — Full documentation
- [`@mcphero/core`](https://www.npmjs.com/package/@mcphero/core) — Core library
