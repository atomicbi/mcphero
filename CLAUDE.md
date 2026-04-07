# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

MCPHero is a TypeScript toolkit for building MCP (Model Context Protocol) servers and CLI tools from a single set of "Actions". Define an action once, then expose it via multiple adapters (MCP stdio, MCP HTTP, Fastify REST API, or CLI).

## Commands

```bash
pnpm build          # Build all packages with tsup (ESM output to build/)
pnpm check          # Lint + typecheck all packages
pnpm clean          # Clean all build outputs and turbo cache

# Run example servers (not automated tests — these start live servers)
pnpm tsx example/src/stdio.ts    # MCP stdio server
pnpm tsx example/src/http.ts     # MCP streamable HTTP server on :8080
pnpm tsx example/src/fastify.ts  # Fastify REST API with Swagger on :8080
pnpm tsx example/src/http-auth.ts # MCP HTTP with bearer token auth on :8080
pnpm tsx example/src/http-oauth.ts # MCP HTTP with Google OAuth 2.1 on :8080
pnpm tsx example/src/cli.ts      # CLI mode

# MCP Inspector (connects to example stdio via .mcp.json)
pnpm mcp
```

## Architecture

The core pattern is **Action → Adapter → MCPHero**:

- **Action** (`packages/core/src/util/action.ts`): A named operation with a Zod input schema and an async `run(input, context)` function. Actions are adapter-agnostic — they receive a `Logger` via context.
- **Adapter** (`packages/core/src/util/adapter.ts`): Translates actions into a specific transport. `AdapterFactory<T>` takes config options, returns an `AdapterGenerator` that takes `MCPHeroOptions` and produces an `Adapter` with `start(actions)` / `stop()`.
- **MCPHero** (`packages/core/src/lib/mcphero.ts`): Fluent builder — `mcphero(opts).adapter(generator).action(action).start()`.

### Packages

| Package | Path | Description |
|---------|------|-------------|
| `@mcphero/core` | `packages/core` | Core library — actions, adapters, builder, context, logger, utilities |
| `@mcphero/auth` | `packages/auth` | Auth — OAuth 2.1 proxy (PKCE, refresh tokens, CIMD, dynamic client registration), bearer token validation, protected resource metadata (RFC 9728). Standalone — only depends on `jose` |
| `@mcphero/mcp` | `packages/mcp` | MCP adapters — stdio, streamable HTTP, CLI proxy |
| `@mcphero/cli` | `packages/cli` | CLI adapter — commander + clack terminal UI |
| `@mcphero/fastify` | `packages/fastify` | Fastify REST adapter — auto-generated OpenAPI/Swagger docs |
| `@mcphero/vercel` | `packages/vercel` | Vercel serverless adapter — stateless MCP over Streamable HTTP |
| `@mcphero/examples` | `example` | Example usage of all adapters |

### Adapters

| Adapter | Package | File | Transport |
|---------|---------|------|-----------|
| `stdio` | `@mcphero/mcp` | `packages/mcp/src/adapter/stdio.ts` | MCP over stdin/stdout (`StdioServerTransport`) |
| `http` | `@mcphero/mcp` | `packages/mcp/src/adapter/http.ts` | MCP Streamable HTTP (`express` + session management) |
| `cliProxy` | `@mcphero/mcp` | `packages/mcp/src/adapter/cliProxy.ts` | MCP CLI proxy client (`commander` + `StreamableHTTPClientTransport`) |
| `fastify` | `@mcphero/fastify` | `packages/fastify/src/adapter/fastify.ts` | REST API with Swagger UI via `@scalar/fastify-api-reference` |
| `cli` | `@mcphero/cli` | `packages/cli/src/adapter/cli.ts` | CLI via `commander` with `@clack/prompts` output |
| `vercel` | `@mcphero/vercel` | `packages/vercel/src/adapter/vercel.ts` | Stateless MCP Streamable HTTP (`WebStandardStreamableHTTPServerTransport`) |

MCP adapters (`stdio`, `http`) register actions as MCP tools using `PascalCase` names. The CLI adapter uses `kebab-case` for commands and maps Zod types to CLI options/arguments.

### Key Utilities (in @mcphero/core)

- `unwrap()` in `packages/core/src/util/zod.ts` — recursively unwraps Zod wrapper types (optional, nullable, default, readonly) to get the base type and metadata. Used by the CLI adapter for option generation.
- `toolResponse()` in `packages/core/src/util/mcp.ts` — wraps any object as MCP `TextContent` JSON.
- `buildLogLevels()` in `packages/core/src/util/logger.ts` — builds a log-level record from a single callback function.
- `buildCLILogger()` / `parseCLIInput()` / `handleCLIError()` in `packages/core/src/util/cli.ts` — CLI logging and input parsing utilities shared by `@mcphero/cli` and `@mcphero/mcp`'s cliProxy.

## Tooling

> Make sure to use the `roam` MCP server and skill (in this repository) when exploring the codebase.

- One `roam` command replaces 5-10 grep/read cycles. Always try roam first.
- Use `roam search` instead of grep/glob for finding symbols — it understands
  definitions vs. usage and ranks by importance.
- `roam context` gives exact line ranges — more precise than reading whole files.
- After `git pull`, run `roam index` to keep the graph fresh.
- For disambiguation, use `file:symbol` syntax: `roam symbol myfile:MyClass`.

## Code Style

- ESM-only (`"type": "module"` in package.json)
- No semicolons, single quotes, 2-space indent, no trailing commas
- Unused vars must be prefixed with `_`
- Imports use `.js` extensions (NodeNext module resolution)
- Zod v4 (`zod@^4.3.6`)

## Wrapup Config

- check: `pnpm check`
- test: skip
- push: yes
- version_bump: yes (aligned across all packages)
- publish: yes (manual — prompt to run `! pnpm publish:all`)
- docs: per-package README.md + root CLAUDE.md as index
- frontend_smoke: N/A
