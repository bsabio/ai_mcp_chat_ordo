# Ordo LLM Research Index

Welcome. This directory contains research and mapping documents designed for AI agents to navigate the Ordo system efficiently.

## Core Navigation

| Document | Purpose | Key Connections |
| :--- | :--- | :--- |
| [01-architecture.md](./01-architecture.md) | High-level system map and flow. | `src/core`, `src/app/api`, `src/lib/chat` |
| [02-capabilities.md](./02-capabilities.md) | Catalog of 41+ AI-accessible tools. | `src/core/use-cases/tools`, `ToolRegistry.ts` |
| [03-deferred-jobs.md](./03-deferred-jobs.md) | Async agent task orchestration. | `ToolDescriptor.ts`, `deferred-job-status.tool.ts` |
| [04-philosophy.md](./04-philosophy.md) | Agent-First vs Human-First design patterns. | `theme-manifest.ts`, `ToolDescriptor.ts` |

## How to use this documentation
As an agent, you should refer to these maps before conducting a wide search of the codebase. These documents link directly to the source of truth for each subsystem.

---
*Created by Antigravity on 2026-03-27*
