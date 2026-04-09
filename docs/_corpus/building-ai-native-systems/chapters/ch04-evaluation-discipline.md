# Evaluation Discipline: The Skill Most AI Courses Skip

## Why Evaluation Is the Central Skill

Most AI engineering curricula spend 90% of their time on building and 10% on evaluation. This ratio is backwards for production work.

Building a system that produces plausible-looking outputs is relatively straightforward. Building a system whose failure modes are understood, bounded, and recoverable — and proving that it works reliably enough for real users to depend on — is the hard part. Evaluation is the discipline that makes the second thing possible.

The practitioners who are most valuable in AI-forward organizations are not the ones who can prompt GPT-4 effectively. They are the ones who can tell whether their system is working, specify what "working" means quantitatively, write tests that detect regressions, and make data-driven decisions about when to ship, when to pause, and what to fix.

## What Evaluation Infrastructure Is

Evaluation infrastructure for LLM systems is the set of tools, test cases, metrics, and processes that allow you to measure system quality systematically.

It includes:

**A test suite** with queries that have known correct answers or known quality criteria. This is the regression test bed — you run it before and after any system change to verify you have not degraded quality in your attempt to improve it.

**Quality metrics** specific to your application domain. Different applications need different metrics:
- For RAG: retrieval recall (does the relevant passage get retrieved?), context precision (is the retrieved context relevant?), answer faithfulness (does the response stay grounded in context?), answer relevance (does it answer the actual question?)
- For agentic systems: task completion rate, step efficiency, tool selection accuracy, error recovery rate
- For generation quality: coherence, factual accuracy, instruction following, format compliance

**A comparison framework** for A/B evaluation. When you change a prompt, a model, or a retrieval strategy, you need a systematic way to compare the old and new system on the same set of questions. Subjective impression is not sufficient.

**A failure mode taxonomy** specific to your system. Not all failures are equal. A system that occasionally produces slightly suboptimal responses is different from one that occasionally produces confidently wrong medical advice. Knowing your specific failure modes, their frequency, and their severity is a prerequisite for responsible production deployment.

## Red-Teaming for LLM Systems

Red-teaming is the practice of deliberately trying to make your system misbehave — to find failure modes before real users do.

For LLM systems, red-teaming includes:

**Adversarial prompt testing:** Can the system be prompted to produce harmful outputs? What happens when users attempt to "jailbreak" the system or bypass safety guidelines?

**Edge case exploration:** What happens at the boundaries of the system's intended operation? Queries that are almost in scope but not quite? Queries in unexpected languages or formats?

**Context injection attacks:** For RAG systems, what happens if a retrieved document contains adversarial content designed to manipulate the model's response?

**Stress testing:** What happens under load, with concurrent users, or with unusually long contexts?

Red-teaming should be systematic and documented. The findings should inform specific changes to the system or specific deployment constraints. A red-teaming report is a governance artifact — evidence that the system was evaluated for safety before deployment.

## Building the Evaluation Harness

The practical implementation:

**Step 1: Define what "correct" means for your application.** This is harder than it sounds. For many LLM applications, there is no single correct answer — only better and worse responses against a set of criteria. Define those criteria explicitly before writing tests.

**Step 2: Build a golden set of queries.** 30-50 queries that comprehensively cover your application's intended use cases. For each query, document: the expected behavior, the acceptance criteria, and the failure modes you are specifically testing for.

**Step 3: Run the golden set against your system.** Score each response against the acceptance criteria. Establish a baseline.

**Step 4: Integrate into the development workflow.** Run the golden set on every significant system change. Track the scores over time. Treat a regression in score as a blocked deployment.

**Step 5: Extend the suite when new failure modes are discovered.** Every production failure should produce a new test case. Over time, the suite builds into a comprehensive regression buffer.
