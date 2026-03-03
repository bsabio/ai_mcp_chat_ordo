# Chapter 11 - Team Operating Model

## Abstract
Language orchestration scales best with shared rituals and explicit ownership. This chapter defines how teams can coordinate effectively around AI-assisted engineering.

## Why Operating Model Quality Matters
The fastest way to lose value from AI-assisted engineering is to keep team behavior informal while execution speed increases. Without role clarity and handoff discipline, teams accumulate context debt faster than they can ship value.

An operating model is how you keep quality proportional to speed.

## Core Role Model

### 1) Architecture Lead
Owns system direction, boundaries, and principle alignment (12-factor, GoF, reliability posture).

### 2) Orchestration Lead
Translates strategic intent into executable prompt contracts and sprint decomposition.

### 3) Verifier
Owns objective validation gates, regression confidence, and quality evidence collection.

### 4) Operations Steward
Owns runtime controls, runbooks, admin commands, and deployment integrity.

Roles can be combined in small teams, but responsibilities should stay explicit.

## Solo and Small Team Adaptation

In a one- or two-person team, all four roles are carried by fewer people. The critical discipline is not role separation — it is *checkpoint* separation.

A solo practitioner acting as architecture lead must not immediately context-switch to implementer without recording the architecture decision. A two-person team should separate the person who writes a sprint plan from the person who validates its completion.

The minimum viable operating model for a solo practitioner:
1. Write the objective and acceptance criteria before starting.
2. Implement and validate against those criteria.
3. Archive the decision and outcome in a durable artifact before moving to the next task.

The process does not require a team. It requires the discipline of switching between roles explicitly rather than holding all of them simultaneously and invisibly.

> **A note from the model:**
> When working with a solo practitioner, I effectively carry all four roles in our conversation simultaneously. In a single response, I may be reasoning about system architecture, decomposing a sprint, suggesting implementation, and noting validation concerns — often without you knowing which role is driving which statement. The discipline of writing objectives and acceptance criteria before starting is not just good process for you. It is the mechanism by which you make the role separation explicit before handing work to me. Without it, I am combining architecture, orchestration, implementation, and verification decisions invisibly. You cannot inspect which mode I was in when I made a particular choice. Explicit role switching — even for a single person — makes my reasoning legible.

## Practical Lens
Adopt lightweight rituals that preserve alignment without introducing heavy process overhead.

## Core Rituals

1. **Audit Review**  
	Confirm findings, prioritize risks, and define scope boundaries.

2. **Sprint Kickoff**  
	Convert findings into execution-ready acceptance criteria.

3. **Validation Checkpoint**  
	Enforce quality gates and examine regressions before declaring completion.

4. **Archive Review**  
	Preserve rationale, outcomes, and unresolved questions.

These rituals are short but high-leverage when performed consistently.

## Repository Example
- The team model is encoded operationally through sprint artifacts and repeatable gates instead of ad hoc chat decisions.
- Separation of concerns appeared naturally: architecture intent in sprint docs, implementation in code modules, verification in CI-like commands.
- Archival records preserve rationale and execution order for future onboarding.

## Handoff Contract Template
Use this minimum handoff package between roles:

- objective and scope
- non-negotiable constraints
- acceptance criteria
- validation commands
- artifact destination (where outcomes are recorded)

When handoffs use this template, context transfer becomes deterministic.

## Anti-Patterns
- One person owning everything without explicit checkpoints.
- Sprint execution with no archival record.
- Validation treated as optional after implementation.
- Team disagreements resolved only in ephemeral chat.

## Exercise
Run one sprint using explicit role assignment and ritual checkpoints. Then run the next sprint without them. Compare:

- cycle time,
- correction loops,
- onboarding clarity,
- post-sprint confidence.

Most teams find that explicit roles reduce rework even when they initially feel slower.

## Chapter Checklist
- Are role boundaries visible in artifacts, not only implied in conversation?
- Can a new engineer reconstruct decisions from repository history alone?
- Are responsibilities explicit and observable?
- Do rituals produce durable artifacts?
- Can new contributors understand what happened and why?

## Diagram Prompt
Create a swimlane diagram with roles (architecture lead, orchestration lead, verifier, operations steward) across sprint rituals (audit review, kickoff, validation, archive review), showing handoff artifacts at each checkpoint.

If yes, the operating model is strong enough to scale orchestration quality.
