# MCPHero

**Write your logic once. Run it everywhere.**

MCPHero is a TypeScript toolkit that lets you define application logic as portable **Actions** and instantly expose them through any combination of transports — MCP servers (stdio and HTTP), REST APIs with auto-generated OpenAPI docs, and fully-featured CLIs. No glue code required.

```
                     ┌─────────────────────┐
                     │       Action         │
                     │  name + zod schema   │
                     │  + async run()       │
                     └──────────┬──────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                  │
     ┌────────▼────────┐ ┌─────▼──────┐ ┌────────▼────────┐
     │   MCP (stdio)   │ │  Fastify   │ │      CLI        │
     │   MCP (http)    │ │  REST API  │ │   commander +   │
     │                 │ │  + Swagger │ │   clack         │
     └─────────────────┘ └────────────┘ └─────────────────┘
```

---

## Table of Contents

- [Why MCPHero](#why-mcphero)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
  - [Actions](#actions)
  - [Adapters](#adapters)
  - [The MCPHero Builder](#the-mcphero-builder)
- [Adapters in Depth](#adapters-in-depth)
  - [MCP Stdio](#mcp-stdio)
  - [MCP Streamable HTTP](#mcp-streamable-http)
  - [Fastify REST API](#fastify-rest-api)
  - [CLI](#cli)
- [Logging and Progress](#logging-and-progress)
- [Advanced Patterns](#advanced-patterns)
  - [Multiple Adapters Simultaneously](#multiple-adapters-simultaneously)
  - [CLI Arguments vs Options](#cli-arguments-vs-options)
  - [Complex Input Types](#complex-input-types)
- [MCP Client Configuration](#mcp-client-configuration)
- [API Reference](#api-reference)
- [Development](#development)

---

## Why MCPHero

Building an MCP server usually means wiring up transports, registering tools, serializing responses, and handling errors — for every single tool. If you also want a CLI or REST API for the same logic, you're writing it all again.

MCPHero eliminates this duplication. You define an **Action** — a name, a Zod schema, and an async function — and MCPHero handles the rest:

- **MCP adapters** register your actions as MCP tools with proper notifications, progress reporting, and error handling
- **Fastify adapter** generates a REST API with full OpenAPI/Swagger documentation derived from your Zod schemas
- **CLI adapter** builds a complete command-line interface with argument parsing, option flags, and beautiful terminal output via clack

Your action doesn't know or care which transport is running it.

---

## Quick Start

```bash
npm install mcphero
# or
pnpm add mcphero
```

Create an action:

```typescript
// actions/greet.ts
import z from 'zod'
import { createAction } from 'mcphero'

export const GreetAction = createAction({
  name: 'greet',
  description: 'Greet someone by name',
  input: z.object({
    name: z.string().describe('The name to greet'),
    enthusiastic: z.boolean().describe('Add excitement').default(false)
  }),
  run: async ({ name, enthusiastic }, { logger }) => {
    const greeting = enthusiastic ? `HELLO, ${name.toUpperCase()}!!!` : `Hello, ${name}.`
    logger.info(greeting)
    return { greeting }
  }
})
```

Serve it as an MCP server:

```typescript
// server.ts
import { mcphero, stdio } from 'mcphero'
import { GreetAction } from './actions/greet.js'

await mcphero({ name: 'my-server', description: 'My MCP Server', version: '1.0.0' })
  .with(stdio())
  .mount(GreetAction)
  .start()
```

That's it. Your action is now an MCP tool called `Greet` that any MCP client (Claude Desktop, Cursor, Claude Code, etc.) can discover and invoke.

---

## Core Concepts

### Actions

An Action is the fundamental unit of logic in MCPHero. It is completely transport-agnostic.

```typescript
import z from 'zod'
import { createAction } from 'mcphero'

export const SearchAction = createAction({
  name: 'search',
  description: 'Search documents by query',
  input: z.object({
    query: z.string().describe('Search query'),
    limit: z.number().int().min(1).max(100).describe('Max results').default(10),
    includeArchived: z.boolean().describe('Include archived documents').default(false)
  }),
  run: async ({ query, limit, includeArchived }, { logger }) => {
    logger.info(`Searching for: ${query}`)
    // ... your logic here
    const results = await performSearch(query, { limit, includeArchived })
    return { results, count: results.length }
  }
})
```

**`createAction`** accepts an object with:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Unique identifier. Adapters transform this automatically (PascalCase for MCP tools, kebab-case for CLI commands, as-is for REST routes). |
| `description` | `string` | Human-readable description. Shown in MCP tool listings, CLI help, and Swagger docs. |
| `input` | `z.ZodObject` | A Zod object schema defining the input. `.describe()` on each field provides per-field documentation across all adapters. |
| `args` | `(keyof I)[]` | *(Optional)* Fields to expose as positional CLI arguments instead of `--options`. Only relevant for the CLI adapter. |
| `run` | `(input, context) => Promise<O>` | The implementation. Receives validated input and an `ActionContext` with a `logger`. Returns any object — adapters handle serialization. |

### Adapters

Adapters are the bridge between your actions and the outside world. Each adapter is a factory function that takes configuration and returns a generator compatible with the MCPHero builder.

```typescript
import { stdio, http, fastify, cli } from 'mcphero'

// No config needed
stdio()

// Host and port required
http({ host: '127.0.0.1', port: 3000 })

// Full Fastify options pass-through
fastify({ host: 'localhost', port: 8080, logger: true })

// No config needed
cli()
```

The adapter lifecycle:

1. **Factory** — `stdio()` / `http({ ... })` / etc. captures configuration
2. **Generator** — MCPHero calls the factory result with `{ name, description, version }` to produce an `Adapter`
3. **Start** — `adapter.start(actions)` registers all actions and begins listening
4. **Stop** — `adapter.stop()` tears down gracefully

### The MCPHero Builder

The builder provides a fluent, chainable API:

```typescript
const app = mcphero({
  name: 'my-toolkit',
  description: 'A collection of useful tools',
  version: '2.1.0'
})

app
  .with(stdio())               // Add an adapter
  .with(http({ ... }))         // Add another — they run in parallel
  .mount(SearchAction)         // Mount an action
  .mount(GreetAction)          // Mount another

await app.start()              // Start all adapters concurrently
```

`.with()` and `.mount()` return the same instance, so you can chain freely. `.start()` launches all adapters in parallel via `Promise.all`.

---

## Adapters in Depth

### MCP Stdio

The standard MCP transport for local tool servers. Communicates over stdin/stdout using the MCP protocol.

```typescript
import { mcphero, stdio } from 'mcphero'

await mcphero({ name: 'my-tools', description: 'My Tools', version: '1.0.0' })
  .with(stdio())
  .mount(MyAction)
  .start()
```

**How actions become MCP tools:**

| Action property | MCP tool property |
|-----------------|-------------------|
| `name: 'searchDocs'` | Tool name: `SearchDocs` (PascalCase) |
| `description` | Tool description |
| `input` (Zod schema) | `inputSchema` (JSON Schema via Zod) |
| Return value | `TextContent` JSON response |
| Thrown errors | Structured error response with name, message, and stack |

MCP logging notifications are wired automatically — `logger.info("message")` in your action sends a `notifications/message` to the MCP client. Progress reporting works via `logger.progress()` when the client provides a progress token.

**Claude Desktop / Claude Code configuration:**

```json
{
  "mcpServers": {
    "my-tools": {
      "command": "node",
      "args": ["path/to/server.js"]
    }
  }
}
```

### MCP Streamable HTTP

A session-based MCP transport over HTTP with Server-Sent Events (SSE) for streaming. Supports multiple concurrent sessions, resumability via `Last-Event-ID`, and session termination.

```typescript
import { mcphero, http } from 'mcphero'

await mcphero({ name: 'my-tools', description: 'My Tools', version: '1.0.0' })
  .with(http({
    host: '127.0.0.1',
    port: 3000,
    allowedHosts: ['127.0.0.1']
  }))
  .mount(MyAction)
  .start()
```

**Endpoints exposed:**

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/mcp` | Initialize session or invoke tools |
| `GET` | `/mcp` | Establish SSE stream for a session |
| `DELETE` | `/mcp` | Terminate a session |

The adapter manages session lifecycle automatically — each new `initialize` request creates a new `StreamableHTTPServerTransport` with a UUID session ID. Sessions are cleaned up when the transport closes.

CORS is configured out of the box, exposing MCP-specific headers (`Mcp-Session-Id`, `Mcp-Protocol-Version`, `Last-Event-Id`).

**`HttpAdapterOptions`:**

| Option | Type | Description |
|--------|------|-------------|
| `host` | `string` | Bind address |
| `port` | `number` | Listen port |
| `allowedHosts` | `string[]` | Hosts allowed to connect (passed to Express MCP app) |

### Fastify REST API

Turns your actions into a REST API with auto-generated OpenAPI documentation and an interactive Swagger UI powered by Scalar.

```typescript
import { mcphero, fastify } from 'mcphero'

await mcphero({ name: 'my-api', description: 'My REST API', version: '1.0.0' })
  .with(fastify({
    host: 'localhost',
    port: 8080,
    logger: true
  }))
  .mount(SearchAction)
  .mount(GreetAction)
  .start()
```

**Route mapping:**

Each action becomes a `POST /{action.name}` route. The Zod schema is converted to JSON Schema for request body validation and OpenAPI documentation.

| Action | Route | Body |
|--------|-------|------|
| `name: 'search'` | `POST /search` | `{ "query": "...", "limit": 10 }` |
| `name: 'greet'` | `POST /greet` | `{ "name": "World" }` |

Visit `http://localhost:8080/` for the interactive Scalar API reference with try-it-out functionality.

**`FastifyAdapterOptions`:**

Extends Fastify's native `FastifyHttpOptions`, so any Fastify config is supported:

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

### CLI

Transforms your actions into a complete command-line application with help text, option parsing, and styled terminal output via clack.

```typescript
import { mcphero, cli } from 'mcphero'

await mcphero({ name: 'mytool', description: 'My CLI Tool', version: '1.0.0' })
  .with(cli())
  .mount(GreetAction)
  .mount(SearchAction)
  .start()
```

**How Zod types map to CLI options:**

| Zod Type | CLI Representation |
|----------|-------------------|
| `z.string()` | `--option-name <string>` |
| `z.number()` | `--option-name <number>` |
| `z.boolean()` | `--option-name` / `--no-option-name` |
| `z.record()` | `--option-name <json>` |
| `.default(value)` | Sets the default in help text |
| `.describe('...')` | Sets the option description |

Field names are automatically converted to `kebab-case` for flags. Action names become `kebab-case` subcommands.

**Example output:**

```
$ mytool greet --name "World" --enthusiastic
◇ mytool - greet
ℹ HELLO, WORLD!!!
```

---

## Logging and Progress

Every action receives a `context.logger` with eight severity levels plus a progress reporter:

```typescript
run: async (input, { logger }) => {
  logger.debug('Starting operation...')
  logger.info('Processing item')
  logger.warning('Rate limit approaching')
  logger.error('Failed to connect')

  // Progress reporting (renders as MCP progress notifications,
  // Fastify trace logs, or console output depending on adapter)
  for (let i = 1; i <= total; i++) {
    logger.progress({
      progress: i,
      total: total,
      message: `Processing item ${i} of ${total}`
    })
    await processItem(i)
  }

  return { processed: total }
}
```

**How logging is handled per adapter:**

| Level | MCP (stdio/http) | Fastify | CLI |
|-------|-------------------|---------|-----|
| `debug` | `notifications/message` | `logger.debug()` | `log.message()` |
| `info` | `notifications/message` | `logger.info()` | `log.info()` |
| `warning` | `notifications/message` | `logger.warn()` | `log.warn()` |
| `error` | `notifications/message` | `logger.error()` | `log.error()` |
| `critical` | `notifications/message` | `logger.fatal()` | `log.error()` |
| `progress` | `notifications/progress` | `logger.trace()` | `console.info()` |

---

## Advanced Patterns

### Multiple Adapters Simultaneously

Run an MCP server and a REST API from the same set of actions:

```typescript
await mcphero({ name: 'my-platform', description: 'Multi-transport', version: '1.0.0' })
  .with(stdio())
  .with(fastify({ host: 'localhost', port: 8080, logger: true }))
  .mount(SearchAction)
  .mount(GreetAction)
  .mount(AnalyzeAction)
  .start()
```

All adapters start concurrently. The MCP stdio server communicates over stdin/stdout while Fastify listens on port 8080 — each serving the exact same actions.

### CLI Arguments vs Options

By default, all Zod fields become CLI `--options`. Use the `args` property to promote fields to positional arguments:

```typescript
export const DeployAction = createAction({
  name: 'deploy',
  description: 'Deploy to an environment',
  input: z.object({
    environment: z.string().describe('Target environment'),
    tag: z.string().describe('Release tag'),
    dryRun: z.boolean().describe('Simulate without deploying').default(false)
  }),
  args: ['environment', 'tag'],
  run: async ({ environment, tag, dryRun }, { logger }) => {
    logger.info(`Deploying ${tag} to ${environment}${dryRun ? ' (dry run)' : ''}`)
    // ...
    return { deployed: !dryRun }
  }
})
```

```
$ mytool deploy production v2.1.0 --dry-run
◇ mytool - deploy
ℹ Deploying v2.1.0 to production (dry run)
```

Fields listed in `args` become positional arguments in the CLI. All other fields remain as `--options`. The `args` property has no effect on MCP or REST adapters — they always receive all fields as a single input object.

### Complex Input Types

Zod's full expressiveness is available for input schemas:

```typescript
export const ImportAction = createAction({
  name: 'import',
  description: 'Import data from a source',
  input: z.object({
    source: z.string().describe('Data source URL'),
    format: z.string().describe('File format').default('json'),
    batchSize: z.number().int().min(1).max(10000).describe('Records per batch').default(500),
    tags: z.record(z.string()).describe('Key-value metadata tags').optional(),
    overwrite: z.boolean().describe('Overwrite existing records').default(false)
  }),
  run: async (input, { logger }) => {
    logger.info(`Importing from ${input.source} in ${input.format} format`)
    logger.info(`Batch size: ${input.batchSize}, overwrite: ${input.overwrite}`)
    if (input.tags) {
      logger.debug(`Tags: ${JSON.stringify(input.tags)}`)
    }
    // ...
    return { imported: 1500 }
  }
})
```

In MCP, this becomes a tool with a full JSON Schema. In the CLI, `tags` becomes `--tags <json>` accepting a JSON string. In Fastify, it's a documented POST body.

---

## MCP Client Configuration

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "my-tools": {
      "command": "node",
      "args": ["/absolute/path/to/server.js"]
    }
  }
}
```

### Claude Code

Add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "my-tools": {
      "command": "pnpm",
      "args": ["tsx", "server.ts"]
    }
  }
}
```

### MCP Inspector

For debugging with the MCP Inspector:

```json
{
  "mcpServers": {
    "my-tools": {
      "command": "pnpm",
      "args": ["tsx", "server.ts"]
    }
  }
}
```

```bash
npx @modelcontextprotocol/inspector --config .mcp.json --server my-tools
```

### HTTP Transport

For the streamable HTTP adapter, point your client at the `/mcp` endpoint:

```
http://127.0.0.1:3000/mcp
```

---

## API Reference

### `mcphero(options)`

Creates a new MCPHero builder instance.

```typescript
function mcphero(options: MCPHeroOptions): MCPHero

interface MCPHeroOptions {
  name: string          // Server/app name
  description: string   // Human-readable description
  version: string       // Semantic version
}

interface MCPHero {
  with(generator: AdapterGenerator): MCPHero   // Add an adapter
  mount(action: Action): MCPHero               // Mount an action
  start(): Promise<MCPHero>                    // Start all adapters
}
```

### `createAction(action)`

Type-safe action factory. Returns the action object as-is with full type inference.

```typescript
function createAction<I extends object, O extends object>(
  action: Action<I, O>
): Action<I, O>

interface Action<I, O> {
  name: string
  description: string
  input: z.ZodType<I> & { shape: Record<string, z.ZodTypeAny> }
  args?: (keyof I)[]
  run: (input: I, context: ActionContext) => Promise<O>
}

interface ActionContext {
  logger: Logger
}
```

### `Logger`

```typescript
interface Logger {
  debug: (data: unknown) => void
  info: (data: unknown) => void
  notice: (data: unknown) => void
  warning: (data: unknown) => void
  error: (data: unknown) => void
  critical: (data: unknown) => void
  alert: (data: unknown) => void
  emergency: (data: unknown) => void
  progress: (options: ProgressOptions) => void
}

interface ProgressOptions {
  progress: number
  total?: number
  message?: string
}
```

### Adapter Factories

```typescript
// MCP over stdin/stdout
function stdio(): AdapterFactory

// MCP Streamable HTTP
function http(options: HttpAdapterOptions): AdapterFactory
interface HttpAdapterOptions {
  host: string
  port: number
  // ...plus CreateMcpExpressAppOptions (e.g., allowedHosts)
}

// Fastify REST API with Swagger
function fastify(options: FastifyAdapterOptions): AdapterFactory
interface FastifyAdapterOptions {
  host?: string
  port?: number
  // ...plus all FastifyHttpOptions (logger, connectionTimeout, etc.)
}

// CLI via commander + clack
function cli(): AdapterFactory
```

---

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Build in watch mode
pnpm watch

# Type-check
pnpm typecheck

# Lint
pnpm lint

# Lint + typecheck
pnpm check
```

Requires Node.js >= 18.

---

## License

MIT
