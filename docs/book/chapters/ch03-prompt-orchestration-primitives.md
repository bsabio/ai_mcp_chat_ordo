# Chapter 3 - Prompt Orchestration Primitives

## Abstract
This chapter defines reusable primitives for controlling LLM behavior: role framing, constraints, acceptance criteria, decomposition, and feedback. These primitives make prompts composable and testable.

## The Primitive Set
If you want repeatable quality, treat prompt orchestration as a composition of primitives.

### 1) Role Framing
Define the operating posture: auditor, implementer, reviewer, operator, or educator. Role framing changes optimization behavior.

### 2) Scope Boundary
Specify exactly what should and should not change. Scope is the guardrail against accidental architecture drift.

### 3) Invariants
State non-negotiable rules (for example: do not skip tests, do not introduce unrelated changes, preserve existing API behavior unless explicitly requested).

### 4) Acceptance Criteria
Make completion testable. If done cannot be measured, done is ambiguous.

### 5) Sequencing
For larger work, enforce ordered phases: discover -> plan -> implement -> validate -> archive.

### 6) Verification
Tie changes to concrete commands and expected outputs.

### 7) Artifact Discipline
Persist decisions in durable files (plans, runbooks, QA notes), not only chat history.

## Why Primitives Beat Clever Prompts
A single clever prompt may produce good output once. Primitive-driven orchestration produces good output repeatedly.

That difference matters in real software where consistency beats novelty.

## Repository Example: Primitive Mapping
This repository’s execution path maps directly to the primitive set:

- Scope and sequencing: multi-sprint workflows in `sprints/planning`, `sprints/active`, `sprints/completed`.
- Invariants and verification: repeated gates through `npm test`, `npm run lint`, `npm run build`.
- Artifact discipline: QA reports and sprint completion notes in `sprints/completed`.
- Named framework compression: 12-factor and GoF directives converted into concrete module-level refactors.

## Reusable Prompt Skeleton
Use this skeleton as a baseline orchestration contract:

1. Role: define the execution persona.
2. Scope: define in-bound and out-of-bound changes.
3. Invariants: define hard constraints.
4. Acceptance: define objective completion checks.
5. Sequence: define ordered steps for non-trivial work.
6. Validation: define exact commands and expected status.
7. Deliverable: define required artifacts.

## Anti-Patterns
- Vague objective with no constraints.
- Multiple priorities with no sequencing.
- Architectural changes with no regression gates.
- Long-running work with no artifact trail.

## Exercise
Take one chapter-level objective and write two orchestration specs:

- Spec A: only high-level request.
- Spec B: primitive-based request using the skeleton above.

Execute both against the same codebase and compare:

- number of correction iterations,
- number of unintended changes,
- validation pass rate,
- artifact completeness.

## Chapter Checklist
- Are primitives defined clearly enough to reuse?
- Are examples tied to this repository’s execution history?
- Is there at least one operational template the reader can apply immediately?

When these checks pass, prompt orchestration stops being “prompt craft” and becomes engineering method.
