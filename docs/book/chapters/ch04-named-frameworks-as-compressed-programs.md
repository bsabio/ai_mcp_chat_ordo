# Chapter 4 - Named Frameworks as Compressed Programs

## Abstract
Names like 12-Factor, GoF, and Uncle Bob are compressed packets of design intent. When invoked clearly, they align humans and models quickly and reduce orchestration ambiguity.

## Framework Names as Semantic Macros
In software, we already rely on compressed references:

- "REST" implies resource-oriented HTTP semantics.
- "CQRS" implies separation of command and query models.
- "TDD" implies red-green-refactor sequencing.

Named frameworks in orchestration work the same way. A phrase like "12-factor audit" can instantly load a broad set of criteria into planning behavior. A phrase like "GoF refactor" can shift implementation toward compositional patterns and boundary clarity.

This compression is valuable because it increases alignment speed. But compression always trades explicitness for brevity. The risk is not using names; the risk is using names without local contracts.

> The origin stories behind these frameworks — who coined them, what broke, and why they cared — are covered in [Chapter 0](ch00-the-people-behind-the-principles.md).

> **A note from the model:**
> When I read the phrase "GoF refactor" in a prompt, I am not looking up a definition. I am activating a cluster of associated patterns — Observer, Strategy, Decorator, the reasoning about why coupling matters — built up across years of training examples. When you say "make the code better," I activate something far broader and far less specific. Framework names are compression that works *for me* as much as they work between humans. They are the fastest path to shared intent, because they constrain my optimization target before I generate a single character. A well-named directive is not just convenient communication. It is prompt engineering.

## The Contract Pattern
Use this pattern whenever you invoke a named framework:

1. Framework name (semantic macro)
2. Scope boundary (where it applies)
3. Local interpretation (how this codebase defines it)
4. Acceptance checks (how completion is validated)

Without steps 2–4, the macro is underspecified. Different readers—human or model—will fill gaps differently.

## Repository Example: Three Framework Macros
This repo provides three concrete cases.

### Case 1: 12-Factor
The directive produced an audit, a sprint plan, and phased implementation. The result included config hardening, release workflows, health/readiness routes, disposability handling, parity tooling, and admin process scripts.

### Case 2: GoF
The directive produced explicit pattern upgrades in runtime code: Observer event bus, Decorator-based provider wrappers, Chain of Responsibility for provider errors, and later Template Method + Facade for route lifecycle.

### Case 3: Uncle Bob framing
This shifted implementation toward SRP and module boundaries, reducing route-level monoliths and improving testability.

In each case, the framework name accelerated orientation. In each successful case, validation gates and artifact discipline converted orientation into verified outcomes.

## Practical Lens
Use framework names as a start condition, then immediately force local precision.

## Failure Modes
- **Name-only prompting**: invokes a framework but gives no concrete boundaries.
- **Dogmatic transfer**: applies framework rules mechanically without contextual adaptation.
- **Validation gap**: declares compliance without measurable evidence.

## Exercise
Pick one named framework you often use and write:

1. A one-line invocation using only the framework name.
2. A fully qualified invocation using the 4-step contract pattern.

Execute both on a non-trivial task and compare correction load. You should see a large reduction in rework with the qualified version.

## Diagram Prompt
Create a side-by-side flow diagram: left side “name-only directive,” right side “name + scope + local interpretation + acceptance checks.” Show where ambiguity is removed.

## Chapter Checklist
- Does the chapter show why semantic compression is valuable?
- Does it show how ambiguity appears and how to control it?
- Does it tie framework claims to concrete repository outcomes?

A framework name is a powerful shorthand. A framework name plus local contract is orchestration.
