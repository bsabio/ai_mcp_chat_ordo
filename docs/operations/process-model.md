# Process and Concurrency Model

## Process Types
- `web`: Next.js application process (`npm run dev`, `npm run start` via `scripts/start-server.mjs`)
- `admin`: one-off scripts under `scripts/` (env validation, secret scan, health diagnostics)
- `mcp`: calculator MCP tool process (`npm run mcp:calculator`)

## Stateless Requirements
- HTTP request processing must not rely on mutable module-level state.
- Request-specific context must remain in function scope.
- Long-running shared caches are prohibited unless explicitly externalized.

## Concurrency Notes
- Web process can be horizontally scaled behind a load balancer.
- Streaming endpoints must assume connection interruption and retry at client layer.
- Any future background processing should be added as explicit worker process type.

## Shutdown Contract
- `web` process handles `SIGTERM` and `SIGINT` by draining active connections.
- New requests receive `503` during drain window.
- Remaining sockets are force-closed after `SHUTDOWN_TIMEOUT_MS`.

## Operational Guidance
- Scale `web` replicas for throughput.
- Keep `admin` commands idempotent and non-interactive when possible.
- Keep MCP process isolated from web process for fault containment.
