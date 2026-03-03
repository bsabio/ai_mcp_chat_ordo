# Chapter 5 - The Audit-to-Sprint Execution Loop

## Abstract
Reliable orchestration turns abstract critiques into concrete implementation cycles. This chapter presents the operating loop: audit findings, sprint plans, execution, verification, and archival.

## Why This Loop Exists
Large refactors fail less from lack of ideas and more from loss of continuity. Teams often produce strong audits that never become structured execution. Or they implement aggressively without preserving rationale and evidence.

The audit-to-sprint loop solves that gap by converting diagnosis into controlled delivery.

## The Five-Stage Loop

1. **Audit**  
	Identify architectural and operational gaps with explicit findings.

2. **Plan**  
	Convert findings into sprint-sized units with acceptance criteria and sequence.

3. **Execute**  
	Implement one sprint at a time, preserving focus and minimizing cross-sprint drift.

4. **Verify**  
	Run objective gates and collect evidence artifacts.

5. **Archive**  
	Record outcome, move artifacts, and leave a reconstructable trail.

This is not ceremony for its own sake. It is memory architecture for complex change.

> Building high-quality sprint contracts requires precision in how you frame scope, invariants, and acceptance criteria. Those primitives are defined in [Chapter 3](ch03-prompt-orchestration-primitives.md).

## Repository Example: Loop in Action
This repository exercised the full loop in visible artifacts:

- `sprints/planning` stored scoped plans.
- `sprints/active` marked current execution focus.
- `sprints/completed` preserved implemented sprint records and QA audit outputs, including `QA-AUDIT.md` and `QA-AUDIT-12FACTOR.md` as objective evidence after each implementation wave.

The 12-factor wave and GoF wave both followed this model. The loop enforced continuity over many refactors without losing architectural intent.

## Why Validation Is Non-Negotiable
The loop is only trustworthy when verification is objective. In this repo, recurring quality gates acted as completion checks:

- `npm test`
- `npm run lint`
- `npm run build`

Narrative claims were accepted only when these gates passed.

## Practical Lens
Use this loop whenever work spans multiple files, concepts, or operational domains.

## Anti-Patterns
- **Audit theater**: writing findings without implementation path.
- **Execution sprawl**: doing many unrelated changes in one sprint.
- **Evidence debt**: claiming completion without repeatable validation outputs.
- **Context amnesia**: losing rationale because decisions stayed only in chat.

> **A note from the model:**
> Context amnesia is not a metaphor. I have no memory between conversations. Each session, I begin fresh — no recall of what we decided last week, no awareness of what broke during the last sprint, no knowledge of what the architecture looked like before your last refactor. Everything this project captured in sprint documents, QA reports, and audit artifacts is not just documentation for humans. It is the literal memory I can access when you load it into context. When you hand me a completed sprint archive, you are giving me my own history. When you skip that step, I am reasoning from a blank slate while you are working with accumulated knowledge. That asymmetry explains most of the correction cycles teams experience.

## Exercise
Take one active architectural concern and run a miniature loop:

1. Write a one-page audit.
2. Break it into 2–3 sprint files with acceptance criteria.
3. Execute exactly one sprint.
4. Validate with your standard gates.
5. Archive results in a completed artifact.

Repeat once. By the second cycle, your team will feel the reduction in ambiguity.

## Diagram Prompt
Draw the five-stage loop (Audit -> Plan -> Execute -> Verify -> Archive) and annotate each stage with one concrete repository artifact path.

## Chapter Checklist
- Are all five stages present and operationalized?
- Can each stage be traced to a repository artifact?
- Do completion claims include objective validation evidence?

When the loop is disciplined, orchestration scales without losing engineering rigor.
