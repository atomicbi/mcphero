# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

MCPHero is a TypeScript toolkit for building MCP (Model Context Protocol) servers and CLI tools from a single set of "Actions". Define an action once, then expose it via multiple adapters (MCP stdio, MCP HTTP, Fastify REST API, or CLI).

## Commands

```bash
pnpm build          # Build with tsup (ESM output to build/)
pnpm watch          # Build in watch mode
pnpm typecheck      # Type-check without emitting
pnpm lint           # ESLint
pnpm check          # Lint + typecheck

# Run test servers (not automated tests — these start live servers)
pnpm tsx test/stdio.ts    # MCP stdio server
pnpm tsx test/http.ts     # MCP streamable HTTP server on :8080
pnpm tsx test/fastify.ts  # Fastify REST API with Swagger on :8080
pnpm tsx test/cli.ts      # CLI mode

# MCP Inspector (connects to test/stdio.ts via .mcp.json)
pnpm mcp
```

## Architecture

The core pattern is **Action → Adapter → MCPHero**:

- **Action** (`src/util/action.ts`): A named operation with a Zod input schema and an async `run(input, context)` function. Actions are adapter-agnostic — they receive a `Logger` via context.
- **Adapter** (`src/util/adapter.ts`): Translates actions into a specific transport. `AdapterFactory<T>` takes config options, returns an `AdapterGenerator` that takes `MCPHeroOptions` and produces an `Adapter` with `start(actions)` / `stop()`.
- **MCPHero** (`src/lib/mcphero.ts`): Fluent builder — `mcphero(opts).with(adapter).mount(action).start()`.

### Adapters

| Adapter | File | Transport |
|---------|------|-----------|
| `stdio` | `src/adapter/stdio.ts` | MCP over stdin/stdout (`StdioServerTransport`) |
| `http` | `src/adapter/http.ts` | MCP Streamable HTTP (`express` + session management) |
| `fastify` | `src/adapter/fastify.ts` | REST API with Swagger UI via `@scalar/fastify-api-reference` |
| `cli` | `src/adapter/cli.ts` | CLI via `commander` with `@clack/prompts` output |

MCP adapters (`stdio`, `http`) register actions as MCP tools using `PascalCase` names. The CLI adapter uses `kebab-case` for commands and maps Zod types to CLI options/arguments.

### Key Utilities

- `unwrap()` in `src/util/zod.ts` — recursively unwraps Zod wrapper types (optional, nullable, default, readonly) to get the base type and metadata. Used by the CLI adapter for option generation.
- `toolResponse()` in `src/util/mcp.ts` — wraps any object as MCP `TextContent` JSON.
- `buildLogLevels()` in `src/util/logger.ts` — builds a log-level record from a single callback function.

## Code Style

- ESM-only (`"type": "module"` in package.json)
- No semicolons, single quotes, 2-space indent, no trailing commas
- Unused vars must be prefixed with `_`
- Imports use `.js` extensions (NodeNext module resolution)
- Zod v4 (`zod@^4.3.6`)
