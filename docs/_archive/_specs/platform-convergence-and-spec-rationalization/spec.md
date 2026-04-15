# Platform Convergence And Spec Rationalization

> **Status:** Draft v1.0
> **Date:** 2026-03-23
> **Scope:** Converge the repository around the Platform V1 product direction, preserve the content and knowledge substrate that powers build-time and runtime intelligence, evaluate which inherited capabilities are kept or repurposed, and archive superseded specification documents so the active spec set is small, current, and trustworthy.
> **Dependencies:** [Platform V1](../platform-v1/spec.md), [Librarian](../librarian/spec.md), [Tool Architecture](../tool-architecture/spec.md), [Interactive Chat Actions](../interactive-chat-actions/spec.md), [Footer Information Architecture](../footer-information-architecture/spec.md)
> **Affects:** `docs/_specs/README.md`, `docs/_specs/archive/`, legacy feature folders superseded by Platform V1, content-route and corpus-facing specs, `src/lib/dashboard/`, `src/lib/shell/`, `src/app/library/`, `src/app/corpus/`, `src/app/blog/`, config and librarian integration docs, and any feature-owned artifacts that still describe dashboard-first or multi-modal product behavior as current state.
> **Motivation:** Platform V1 is now the main product direction, but the repository still contains a large volume of older specs that describe prior UI modalities, partially superseded architecture, or legacy naming. That creates planning drift. The codebase also contains inherited functionality that should survive the V1 transition, especially the books/corpus/librarian content system. The system needs a canonical active spec set, a clear keep/repurpose/delete policy, and an archival path for historical docs so the product reads as one coherent platform instead of overlapping design eras.
> **Requirement IDs:** `PCR-001` through `PCR-099`

---

## 1. Problem Statement

### 1.1 Current state

The repository has a mature specification corpus and a meaningful amount of already-shipped infrastructure. Platform V1 establishes the primary product direction: a deployable chat-first AI business system. However, the active docs still reflect multiple prior centers of gravity.

Examples of drift already visible:

1. Platform V1 supersedes dashboard-centered specs, but older dashboard spec families remain present and detailed. `[PCR-001]`
2. The content system appears under overlapping names such as `books`, `book`, `corpus`, and `library`, even though the underlying capability is strategically important and should survive the V1 transition. `[PCR-002]`
3. Some inherited capabilities are genuinely valuable platform assets, while others preserve an older modality that now competes with the V1 chat-first model. `[PCR-003]`
4. Historical specs are useful for provenance, but when they remain mixed with active planning documents they increase the chance of implementing the wrong contract. `[PCR-004]`

### 1.2 Verified issues

| # | Issue | Impact |
| --- | --- | --- |
| 1 | **Too many active-looking specs** | Engineers and agents can mistake superseded docs for current product truth. |
| 2 | **No canonical active-spec boundary** | There is no explicit repository rule for which specs are authoritative, supporting, legacy, or archived. |
| 3 | **Knowledge substrate is under-defined in V1 cleanup discussions** | Critical corpus/books/librarian capabilities risk being mistaken for legacy site IA rather than core platform infrastructure. |
| 4 | **Inherited capabilities are not classified** | Valuable logic such as dashboard loaders, content renderers, SEO routes, and referral helpers lacks a keep/repurpose/delete decision record. |
| 5 | **Product cohesion is diluted by historical modality drift** | The repo can read like a dashboard product, a teaching repo, a corpus browser, and a chat-first platform at the same time. |

### 1.3 Root cause

The codebase evolved through multiple design phases. The platform now needs one current operating model, but the documentation system still exposes several historical models in parallel.

### 1.4 Why it matters

Without convergence work:

1. Platform V1 will remain correct in theory but ambiguous in execution. `[PCR-005]`
2. Valuable inherited capabilities may be deleted, underused, or rebuilt unnecessarily. `[PCR-006]`
3. Students and deployers will not inherit a clean, teachable, forkable product architecture. `[PCR-007]`
4. The repository will carry a growing documentation tax that obscures product value instead of clarifying it. `[PCR-008]`

---

## 2. Design Goals

1. **One authoritative product direction.** Platform V1 is the primary product contract. Other active specs must either support it explicitly or be archived. `[PCR-010]`
2. **Archive, do not erase.** Superseded specs move to archive with clear provenance rather than being deleted or silently abandoned. `[PCR-011]`
3. **Preserve strategic inherited capabilities.** The books/corpus/librarian system, retrieval pipeline, and other high-value substrate capabilities are treated as core platform assets. `[PCR-012]`
4. **Repurpose before rebuilding.** Existing logic that still creates value should be converted into V1-aligned backends, tools, or routes instead of rewritten from scratch. `[PCR-013]`
5. **Chat-first product cohesion.** The active spec set must describe a single coherent product: one conversational interface, supported by public content, config-driven deployment, referral capture, and admin/business tools behind the chat. `[PCR-014]`
6. **Canonical content model.** The system needs one clear model for source knowledge, public content projections, and librarian-managed knowledge growth. `[PCR-015]`
7. **Clean code, clean docs, clear value.** Architecture cleanup, doc cleanup, and feature cleanup should converge on the same outcome rather than happening as separate housekeeping exercises. `[PCR-016]`

---

## 3. Architecture Direction

### 3.1 Canonical spec authority model

All specs under `docs/_specs/` must classify into one of four states:

| State | Meaning |
| --- | --- |
| **Authoritative** | Current product-defining spec. This is the primary contract for a capability or for the platform as a whole. |
| **Supporting** | Active spec that remains valid because it is referenced by or compatible with the authoritative platform direction. |
| **Legacy** | Historically important spec that still explains shipped code or prior reasoning but is no longer the current product direction. |
| **Archived** | Spec moved out of the active feature index and into `docs/_specs/archive/` with a short archival note explaining why it was superseded. |

Rules:

1. [Platform V1](../platform-v1/spec.md) is the authoritative top-level product contract. `[PCR-020]`
2. A feature spec remains active only if it directly supports Platform V1 or a shipped capability Platform V1 explicitly preserves. `[PCR-021]`
3. A spec that describes a superseded primary modality, such as dashboard-first operation, must be reclassified to legacy and then archived once migration notes are preserved. `[PCR-022]`
4. Historical specs remain linkable for provenance, but they must no longer appear in the active feature table once archived. `[PCR-023]`

### 3.2 Active spec set contract

The repository must maintain a small, explicit active spec set.

The active set should be composed of:

1. the authoritative platform contract `[PCR-024]`
2. supporting cross-cutting architecture specs that remain necessary to implement the platform `[PCR-025]`
3. feature specs whose capabilities are still intentionally part of the product surface `[PCR-026]`
4. sprint docs that belong to active specs and still describe unfinished implementation work `[PCR-027]`

This implies the active set should shrink when Platform V1 absorbs or supersedes a prior feature family. `[PCR-028]`

### 3.3 Canonical content and knowledge model

The books/corpus/librarian system is a core platform substrate, not legacy page IA.

Platform convergence should define the content system in three layers:

1. **Source knowledge layer** — structured business knowledge dropped into the system by a founder, student, or deployer: policies, service descriptions, SOPs, FAQs, training material, case studies, and other domain content. `[PCR-030]`
2. **Build and indexing layer** — the pipeline that discovers source content, derives summaries, builds search indexes, writes embeddings, and prepares public metadata where content is publishable. `[PCR-031]`
3. **Interaction and publication layer** — chat retrieval, librarian-managed additions and edits, and optional public rendering under canonical content routes. `[PCR-032]`

The canonical product rule is:

1. content may be private retrieval-only, public and indexable, or both `[PCR-033]`
2. one source model should drive both AI grounding and public content rendering where applicable `[PCR-034]`
3. librarian capabilities are part of the ongoing knowledge lifecycle, not an isolated utility feature `[PCR-035]`

#### 3.3.1 Canonical content object

Platform convergence should normalize the repository around a single content concept: a **knowledge document collection** that can be rendered, indexed, retrieved, and maintained.

That concept may still be represented on disk through books, chapters, sections, blog posts, manifests, and librarian-imported assets, but the active product contract should describe them as one system with multiple projections rather than as unrelated route families. `[PCR-036]`

The canonical content object must support:

1. a stable source identifier and slugging strategy `[PCR-037]`
2. structured metadata such as title, domain, tags, visibility, and ordering `[PCR-038]`
3. build-time discovery without TypeScript code edits `[PCR-039]`
4. retrieval by chat tools and librarian-managed updates `[PCR-040]`
5. optional publication into canonical public routes `[PCR-041]`

#### 3.3.2 Visibility model

Every content object must fall into one of three visibility modes:

| Mode | Meaning |
| --- | --- |
| **Private knowledge** | Retrieval-only business knowledge. Used by the AI and internal tools, not published on the public site. |
| **Public knowledge** | Publicly rendered and indexable content that also participates in retrieval and grounding. |
| **Internal draft** | Content that exists in the source system or librarian workflow but is not yet eligible for public publication. |

Rules:

1. public rendering is a projection of source knowledge, not a separate authoring system `[PCR-042]`
2. sitemap and SEO infrastructure include only public knowledge `[PCR-043]`
3. private knowledge is still fully available to retrieval, summarization, and tool-backed business workflows `[PCR-044]`
4. librarian operations may create or update private knowledge without automatically making it public `[PCR-045]`

#### 3.3.3 Build and refresh contract

The content system must support two refresh paths:

1. **Build-time ingestion** — the deployer drops in company policies, services, and business knowledge before build or deployment, and the system indexes them into the search and retrieval pipeline. `[PCR-046]`
2. **Runtime knowledge maintenance** — librarian tools add or reorganize knowledge after deployment, followed by a controlled refresh or rebuild path that keeps the system's knowledge base current. `[PCR-047]`

The convergence work does not need to finalize every runtime-refresh implementation detail, but it must define the contract clearly enough that later V1 work can decide when content changes require:

1. immediate retrieval refresh `[PCR-048]`
2. deferred indexing or embedding rebuild `[PCR-049]`
3. explicit admin publication review `[PCR-050]`

#### 3.3.4 Route and naming consequences

Because the content system is strategic, the repository should treat route names such as `books`, `book`, `corpus`, `library`, and `blog` as **projections and compatibility layers**, not as separate product centers.

Rules:

1. one canonical public route family must eventually own user-facing public content browsing `[PCR-051]`
2. compatibility routes may remain temporarily, but they should be documented as aliases or redirects rather than active product concepts `[PCR-052]`
3. content naming in active specs should describe the canonical knowledge model first and route vocabulary second `[PCR-053]`

### 3.4 Keep / repurpose / delete policy

Every inherited capability touched by Platform V1 migration work must be classified before implementation.

#### Keep

Capabilities that are already aligned with V1 or are core platform substrate stay first-class.

Examples:

1. chat runtime, tool orchestration, and rich-content rendering `[PCR-040]`
2. config loading and validation `[PCR-041]`
3. corpus/library/librarian knowledge substrate `[PCR-042]`
4. referral capture and attribution primitives `[PCR-043]`
5. SEO and public content infrastructure `[PCR-044]`

#### Repurpose

Capabilities whose underlying logic is valuable but whose current modality or framing is legacy must be converted into V1-aligned roles.

Examples:

1. dashboard loaders become admin chat-tool backends `[PCR-045]`
2. dashboard handoff becomes generic task-origin handoff context `[PCR-046]`
3. shell navigation becomes sparse chat-first IA `[PCR-047]`
4. profile becomes apprentice/referral/instance workspace rather than a generic placeholder page `[PCR-048]`

#### Delete

Capabilities that primarily preserve a superseded modality, duplicate newer infrastructure, or provide no product value should be removed.

Examples:

1. dashboard-specific presentation layers once their data logic has been migrated `[PCR-049]`
2. dev-facing UI affordances that no longer belong in the deployable product surface `[PCR-050]`
3. redundant route vocabularies or aliases once canonical content routes are in place `[PCR-051]`

### 3.5 Archive structure

Archived specs must move under `docs/_specs/archive/` in a way that preserves provenance.

Recommended structure:

```text
docs/_specs/archive/
├── README.md
├── 2026-platform-v1-superseded/
│   ├── dashboard-ai-action-workspace/
│   ├── dashboard-rbac-blocks/
│   ├── floating-chat-visual-authority/
│   └── ...
```

Each archived feature folder should include:

1. the original spec and sprint docs `[PCR-052]`
2. a short archive note explaining why it was archived and what replaced it `[PCR-053]`
3. a link back to the authoritative Platform V1 contract or successor feature spec `[PCR-054]`
4. a recorded entry in the active-spec inventory showing when the feature moved from active or legacy to archived `[PCR-055]`

### 3.6 Repository cleanup boundaries

This workstream is allowed to modify three kinds of artifacts:

1. **Planning artifacts** — spec files, sprint docs, indexes, archive notes, and active-spec inventories. `[PCR-056]`
2. **Naming and route surfaces** — shell and content naming that still communicates an obsolete product model. `[PCR-057]`
3. **Legacy modality code** — UI surfaces explicitly retired by Platform V1 once their useful backend logic is preserved or migrated. `[PCR-058]`

This workstream must not casually rewrite core runtime logic unless that runtime logic is directly implicated by a keep/repurpose/delete decision. `[PCR-059]`

---

## 4. Security And Product Truthfulness

1. Archived specs must remain readable and attributable; archival is not historical deletion. `[PCR-060]`
2. The active spec index must not list archived or legacy-only specs as current implementation contracts. `[PCR-061]`
3. Public content docs must preserve the distinction between publishable content and private retrieval-only business knowledge. `[PCR-062]`
4. Canonical content routing must not expose unpublished or draft material merely because it exists in the knowledge source tree. `[PCR-063]`
5. Docs cleanup must not claim capabilities are removed if the code and tests still treat them as active dependencies. `[PCR-064]`

---

## 5. Testing Strategy

This feature is primarily documentation and architecture governance work, but it still requires deterministic verification.

### 5.1 Doc and inventory verification

| Area | Verification |
| --- | --- |
| Spec index accuracy | Every active spec listed in `docs/_specs/README.md` exists and has a current purpose statement |
| Archive accuracy | Every archived feature folder includes an archive note and no longer appears in the active feature table |
| Platform alignment | Every spec marked active explicitly supports Platform V1 or a V1-preserved capability |
| Content-model clarity | The canonical content model clearly distinguishes source knowledge, build/index pipeline, and public projection |

### 5.2 Codebase convergence verification

| Area | Verification |
| --- | --- |
| Keep/repurpose/delete map | A written inventory exists for major subsystems and is updated as implementation proceeds |
| Legacy modality retirement | Deleted or repurposed UI surfaces have successor backends or archived specs documented |
| Content-system preservation | Corpus/library/librarian-related functionality remains represented in the active platform direction |

### 5.3 Expected implementation artifacts

1. new archive folder and archive README `[PCR-070]`
2. updated `docs/_specs/README.md` active feature table `[PCR-071]`
3. one current active-spec inventory for Platform V1 execution `[PCR-072]`
4. archive notes for each superseded feature family `[PCR-073]`
5. follow-on implementation sprint docs for code deletion, repurposing, and naming cleanup `[PCR-074]`
6. a first archive shortlist artifact with candidate feature families and rationale `[PCR-075]`

---

## 6. Sprint Plan

| Sprint | Goal |
| --- | --- |
| **0** | Inventory the current spec corpus and classify each feature as authoritative, supporting, legacy, or archive-ready |
| **1** | Define the canonical V1 content and knowledge model, including books/corpus/library/librarian boundaries and public-vs-private content rules |
| **2** | Produce and validate the keep/repurpose/delete map for current code and route surfaces against Platform V1 |
| **3** | Reorganize `docs/_specs/README.md`, create the archive structure, and archive superseded specs with clear provenance notes |
| **4** | Apply the convergence cleanup in code: retire legacy modality surfaces, rename canonical routes and concepts where needed, and verify the repository reads as one cohesive product |

---

## 7. Future Considerations

These items are out of scope for this convergence spec and should be handled by later implementation specs if needed.

1. Automated doc-graph tooling that enforces spec-state transitions in CI. `[PCR-090]`
2. A plugin-style spec metadata registry beyond `README.md` and archive notes. `[PCR-091]`
3. Multi-instance content synchronization between deployed Studio Ordo installations. `[PCR-092]`
4. Automatic archive generation for every superseded feature family without manual review. `[PCR-093]`
5. Full knowledge-schema redesign beyond the canonicalization needed for Platform V1 convergence. `[PCR-094]`
