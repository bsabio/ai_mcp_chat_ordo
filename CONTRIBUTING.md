# Contributing to Studio Ordo

First, thank you for your interest in contributing! We appreciate you taking the time to help make this project better.

## At This Stage: Issues Only, No Code PRs Please

To maintain the architectural integrity of the system and maximize development velocity, **we are currently ONLY collecting bug reports and issue submissions.**

Studio Ordo was built from the ground up using rigorous AI-assisted project management controls (detailed in `docs/_corpus/system-docs/chapters/06-ai-project-management.md`). The maintainer pays for the AI tokens to implement fixes and feature requests directly from well-written issues.

**This means we kindly ask that you do not submit Pull Requests containing code fixes or feature additions.**

Instead, please write a comprehensive issue outlining the bug or the requested improvement.

### How to file an issue

When filing a bug or reporting drift in the framework:

1. Provide concrete evidence of the issue (e.g. failing assertion, missing path, UI drift).
2. Note the role you were using when the bug occurred (e.g. `ANONYMOUS`, `ADMIN`).
3. Note any recent tools/actions executed out of the MCP catalog when the issue emerged.
4. Attach deterministic command output when relevant, especially `npm run test`, `npm run build`, `npm run scan:secrets`, `npm run qa:runtime-integrity`, or `npm run release:evidence`.
5. Reference the affected files or docs directly when the issue is architectural or documentation drift.

We use the standard GitHub issue templates. The more descriptive the bug, the faster the AI agents can process it!

For the current release-verification ladder and evidence artifacts, see [docs/operations/release-gates-and-evidence.md](docs/operations/release-gates-and-evidence.md).

Thank you for contributing to our operations layer.
