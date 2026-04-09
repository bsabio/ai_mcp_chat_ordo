# The Thread: What This Book Is and How to Use It

## The Argument in One Sentence

Building a production-quality AI system requires the same engineering discipline as any other production software — with the added complexity that the most interesting failure modes are probabilistic, non-deterministic, and invisible without deliberate evaluation infrastructure.

## What This Book Contains

Six chapters on the theory, architecture, and operational practice of AI-native engineering:

**Ch. 1 — LLM Application Engineering: What It Actually Means**
The gap between the demo and the job. What LLM application engineering actually is. The skill clusters that make it possible. The Forward Deployed profile as the target.

**Ch. 2 — RAG Pipelines from First Principles**
What RAG is and the four problems it solves. The five-component pipeline architecture (corpus, ingestion, retrieval, reranking, generation). What makes a RAG pipeline good vs. bad. The local-first architecture Ordo uses.

**Ch. 3 — Agentic Systems and Tool Use**
What an agent is. The tool use pattern and tool schema design. ReAct, Plan-and-Execute, multi-agent, and human-in-the-loop patterns. What makes agents hard in production. RBAC constraints on tools.

**Ch. 4 — Evaluation Discipline: The Skill Most AI Courses Skip**
Why evaluation is the central skill. What evaluation infrastructure is. Red-teaming for LLM systems. Building the evaluation harness step by step.

**Ch. 5 — Observability, Tracing, and Production Engineering**
The three pillars: logs, metrics, traces. LLM-specific concerns: prompt versioning, semantic drift detection, cost attribution, privacy and audit logging. The operational lifecycle. Graceful degradation.

**Ch. 6 — The Forward Deployed Engineer: The Role This Builds Toward**
The complete profile description. How each book in this curriculum maps to a component of the profile. What the first real job looks like and how it compounds.

## Who This Book Is For

- Students and practitioners building their first production-grade AI application
- Engineers who can build demos but want to understand what it takes to ship reliably
- Technical leads evaluating whether a team's AI engineering practice is production-ready
- Career changers trying to understand what the AI engineering job actually requires day-to-day

## How to Read It

Chapters 1–3 build the technical foundation: what LLM engineering is, how RAG works, how agents work. Chapter 4 is the most important chapter in the book — read it before any production deployment. Chapters 5–6 complete the picture: operational practice and target role.

If you are starting from zero: read in order.
If you are already building: skip to Chapter 4 (evaluation) first. The rest can be read as needed.
If you are evaluating your team's practice: Chapter 4 and Chapter 5 are the diagnostic chapters.
