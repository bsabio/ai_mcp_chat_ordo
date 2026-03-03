# Language as Executable Architecture

This repository is a working companion to a book on professional software engineering in the AI era.

There is a layer of software engineering that separates engineers who write code from engineers who build systems that last. It is not about syntax or algorithms. It is about design discipline, operational thinking, and architectural judgment — the craft that determines whether a system stays maintainable under change, team growth, and production pressure.

AI makes this layer more visible and more urgent by automating the mechanical execution layer beneath it. Engineers who have developed craft use AI as a force multiplier. Engineers who haven't generate code faster without being able to tell whether it will survive contact with reality.

## What This Repository Is

A **working Next.js application** — a Claude-backed chat interface with MCP tool integration — built and refactored using every principle in the book, with the evidence visible in code, tests, and sprint archives.

The app is not a demo. It is proof-of-practice: every architectural claim in the book has a command you can run against this codebase to verify it.

**Quality baseline (production build):**

| Gate | Result |
|---|---|
| TypeScript strict | 0 errors |
| ESLint zero-warnings | 0 warnings |
| Tests | 67/67 passing |
| Lighthouse Performance | 98 / 100 |
| Lighthouse Accessibility | 100 / 100 |
| Lighthouse Best Practices | 100 / 100 |
| Lighthouse SEO | 100 / 100 |

These are not aspirational targets. They are the current state, enforced by the composite quality gate (`npm run quality`) described in Chapter 9.

## What the Book Covers

This book develops engineering judgment through the human stories behind six decades of foundational frameworks, applied to a real codebase with verifiable evidence:

- **Inquiry-based prompting** — how to extract expert-level domain knowledge before writing a single sprint, and concentrate that intelligence through successive specification phases
- **GoF design patterns** — who built them, what was breaking, and how they apply to AI-native systems
- **SOLID principles** — field notes from a developer who spent decades cleaning up code that was unmaintainable by design
- **12-Factor operational discipline** — what Heroku learned from thousands of production failures, applied to LLM-backed applications
- **MCP + Next.js** — the architecture pairing that gives AI systems deterministic, inspectable tool execution
- **Deterministic governance** — TypeScript, ESLint, and Lighthouse as a composite quality gate for AI-generated code velocity

All chapters are executable in this codebase.

## Setup

Use these steps to run the companion project while reading:

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables (recommended in shell):

```bash
export ANTHROPIC_API_KEY="your-api-key"
export ANTHROPIC_MODEL="claude-haiku-4-5"
```

3. Start development server:

```bash
npm run dev
```

4. Run quality gates used throughout the book:

```bash
npm test
npm run lint
npm run build
```

5. Optional parity run (production-like profile):

```bash
docker compose up --build
```

## Table of Contents

0. [Chapter 0 - The People Behind the Principles](docs/book/chapters/ch00-the-people-behind-the-principles.md)  
	The human stories behind six decades of foundational frameworks: Hoare (null reference), Dijkstra (structured programming), Knuth (precision ethic), Brooks (essential complexity), Liskov (substitution), Cunningham (technical debt), the Gang of Four, Beck, Fowler, Thomas & Hunt (Pragmatic Programmer, DRY), Martin, Wiggins (12-Factor), Hejlsberg (TypeScript), Zakas (ESLint), Dahl (Node.js, event-driven server), Walke and the React team (declarative components, RSC), Rauch (Next.js, file-based routing), Torvalds (Git, immutable history), Clark (Import AI, AI governance transparency), and the Anthropic team. Every principle in this book has an origin story. Knowing it makes the principle harder to misapply.

1. [Chapter 1 - Why This Moment Matters](docs/book/chapters/ch01-why-this-moment-matters.md)  
	The engineering layer that separates builders from maintainers has always existed. AI does not eliminate it — it makes the gap wider, faster. This chapter names what changed and why craft judgment is now the scarce resource.

2. [Chapter 2 - A Brief History of Control Surfaces](docs/book/chapters/ch02-history-of-control-surfaces.md)  
	Machine code gave way to assembly, assembly to high-level languages, high-level languages to natural-language orchestration. The pattern is not replacement — it is abstraction with the same failure modes appearing at higher levels. Understanding the lineage prevents repeating it.

3. [Chapter 3 - Prompt Orchestration Primitives](docs/book/chapters/ch03-prompt-orchestration-primitives.md)  
	Constraints, role framing, named frameworks, acceptance criteria, and verification loops are not stylistic choices — they are the building blocks of reliable orchestration. This chapter defines each primitive and explains what breaks when it is missing.

4. [Chapter 4 - Named Frameworks as Compressed Programs](docs/book/chapters/ch04-named-frameworks-as-compressed-programs.md)  
	When you give a model a framework name — 12-Factor, GoF, SOLID — you are loading a compressed program: constraints, tradeoffs, and failure-mode vocabularies built by practitioners over decades. This chapter explains the mechanism and why it matters for orchestration precision.

5. [Chapter 5 - The Audit-to-Sprint Execution Loop](docs/book/chapters/ch05-audit-to-sprint-loop.md)  
	The method behind this entire project: inquiry-based prompting (Phase Zero) gathers expert-level domain context before a single sprint is written, then audit → plan → execute → verify → archive delivers it with continuity. Intelligence is concentrated per phase — maximum breadth at inquiry, maximum specificity at acceptance criteria. Includes deterministic and probabilistic verification in tandem.

6. [Chapter 6 - 12-Factor in the LLM Era](docs/book/chapters/ch06-12-factor-in-the-llm-era.md)  
	Each of the twelve factors reinterpreted for LLM-backed applications: config that includes model version and prompt contracts, disposability that accounts for model warm-up, parity that extends to prompt behavior across environments. The failures Wiggins named at Heroku in 2011 reappear in AI systems built today without this discipline.

7. [Chapter 7 - GoF Patterns for AI-Native Systems](docs/book/chapters/ch07-gof-for-ai-native-systems.md)  
	Observer, Decorator, Chain of Responsibility, Template Method, and Facade — applied not to textbook examples but to the actual LLM route and provider architecture in this repository. Each pattern is shown in code with the problem it solves and the failure mode it prevents.

8. [Chapter 8 - Observability, Feedback, and Evals](docs/book/chapters/ch08-observability-feedback-and-evals.md)  
	A system you cannot observe is a system you cannot improve. This chapter covers request IDs, structured events, error taxonomy, and evaluation loops as engineering primitives — not monitoring add-ons. Without them, AI-assisted iteration produces change without accountability.

9. [Chapter 9 - Risk, Safety, and Operational Governance](docs/book/chapters/ch09-risk-safety-and-governance.md)  
	AI-generated code velocity creates a governance problem: more change, faster, with less human review per line. This chapter answers it with deterministic tools (TypeScript strict, ESLint zero-warnings, Lighthouse at score thresholds) as a composite gate, plus secrets management, failure domains, and orchestration drift controls.

10. [Chapter 10 - Case Study: IS601 Demo](docs/book/chapters/ch10-case-study-is601-demo.md)  
	 This repository's full arc: from scaffolded Next.js app to production-grade architecture with 98/100/100/100 Lighthouse scores, 67 passing tests, and zero ESLint warnings. Every audit, refactor, and sprint decision is preserved and traceable.

11. [Chapter 11 - Team Operating Model](docs/book/chapters/ch11-team-operating-model.md)  
	 How to operate effectively with AI at any team size — including alone. Covers role separation, handoff contracts, and the CEO operating model: using inquiry-based prompting and layered quality verification to build expert-grade systems in domains you do not personally master. You do not need to be a codec engineer to ship a video rendering pipeline. You need to ask a codec engineer's questions before the sprint starts.

12. [Chapter 12 - Future Directions](docs/book/chapters/ch12-future-directions.md)  
	 Where language-as-architecture is heading: language-native tooling, continuous verification loops, and the organizational design changes that follow when AI systems write the majority of code. What the field will look like when the current moment is the baseline.

13. [Chapter 13 - MCP + Next.js: Architecture and Capability Roadmap](docs/book/chapters/ch13-mcp-nextjs-architecture-and-capability-roadmap.md)  
	 MCP is the protocol that makes AI systems doers rather than talkers: typed schemas, explicit invocation contracts, deterministic execution. This chapter explains the architecture, shows how this project uses it, and maps the capability roadmap from tool visibility (Tier 1) to multi-tool registry and human approval checkpoints (Tier 3).

## Companion Materials

- Book QA report: `docs/book/BOOK-QA.md`
- Audience value audit: `docs/book/BOOK-AUDIENCE-AUDIT.md`
- Operations docs: `docs/operations/`
- Sprint archive: `sprints/completed/`
- Runtime scripts: `scripts/`

