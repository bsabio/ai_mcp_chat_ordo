# Environment Matrix

## Runtime Environments

| Environment | Purpose | Required Config | Optional Config |
|---|---|---|---|
| dev | Local development | `ANTHROPIC_API_KEY` | `ANTHROPIC_MODEL` |
| staging | Pre-production validation | `ANTHROPIC_API_KEY` | `ANTHROPIC_MODEL` |
| production | Live traffic | `ANTHROPIC_API_KEY` | `ANTHROPIC_MODEL` |

## Template Files
- `.env.example`
- `.env.staging.example`
- `.env.production.example`

## Parity Rules
- Keep identical key sets across all env templates.
- Avoid legacy aliases in new deployments.
- Validate parity with `npm run parity:env`.
- Validate runtime parity profile with `docker compose up --build`.
