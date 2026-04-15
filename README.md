# Studio Ordo: An All-In-One AI Operator System

Studio Ordo is a solo-built, open-source AI operator system for solopreneurs. It combines governed chat, workflow automation, hybrid retrieval, deferred jobs, publishing, and admin control in one easy-to-host application.

Architecturally, Studio Ordo is a governed Next.js application with an internal tool platform. The product's primary orchestration path runs through its internal ToolRegistry, while MCP is used to export selected capabilities at the system boundary for operational use and interoperability.

The practical advantage is simple: what would often require a web app, queue system, database server, search service, and vector database can run here inside one compact footprint centered on SQLite and the app runtime.

## Compared To A Typical AI Stack

- Studio Ordo keeps chat, retrieval, publishing, admin tooling, and deferred workflows in one governed application instead of spreading them across separate operational products.
- The default operating footprint is intentionally small: SQLite plus the app runtime, rather than a mandatory queue broker, search cluster, vector database, and extra control plane.
- MCP matters here as an export boundary for interoperability, not as the system's core orchestration model.

> **Our canonical documentation and rationale have been moved directly into the system's own retrieval corpus!** This allows the AI agent to understand its own structure natively.

## 📚 Official System Documentation

Please browse the following foundational guides to understand how the system is built, governed, and secured.

- [01: Proof Story and Value Proposition](docs/_corpus/system-docs/chapters/ch01-proof-story-and-value.md)
- [02: Architecture and Containerization (Docker)](docs/_corpus/system-docs/chapters/ch02-architecture-and-docker.md)
- [03: The Role System (RBAC)](docs/_corpus/system-docs/chapters/ch03-role-system.md)
- [04: Tooling and MCP Integration](docs/_corpus/system-docs/chapters/ch04-tooling-and-mcp.md)
- [05: Quick Start and Operations](docs/_corpus/system-docs/chapters/ch05-quick-start.md)
- [06: AI Project Management Methodology](docs/_corpus/system-docs/chapters/ch06-ai-project-management.md)
- [11: Deferred Multi-Agent Workflows](docs/_corpus/system-docs/chapters/ch11-deferred-multi-agent-workflows.md)

## 🐛 Contributing

At this stage in the open-source project lifecycle, **we are intentionally collecting issues and bug reports only.**

Because the system is heavily orchestrated by autonomous AI agents functioning within strict architectural boundaries (detailed in chapter `06` above), the maintainer handles code construction by orchestrating AI prompts against well-written bug reports.

**Please do not submit Pull Requests containing code fixes.** Instead, submit a highly specific Issue! See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## 🚀 Quick Start

```bash
# 1. Install dependencies and set up environment
npm install
cp .env.example .env.local

# 2. Add your ANTHROPIC_API_KEY to .env.local

# 3. Validate your settings and run the app
npm run validate:env
npm run dev

# 4. Open http://localhost:3000
```

Read [05-quick-start.md](docs/_corpus/system-docs/chapters/ch05-quick-start.md) for full setup instructions, push notification configurations, and essential operational CLI commands.

## Verification And Release Evidence

The current repo baseline expects release claims to be backed by deterministic
checks and saved evidence.

```bash
npm run quality
npm run build
npm run scan:secrets
npm run runtime:inventory
npm run qa:runtime-integrity
npm run release:evidence
```

The current release ladder, artifact outputs, and public-governance rules are
documented in [docs/operations/release-gates-and-evidence.md](docs/operations/release-gates-and-evidence.md).
