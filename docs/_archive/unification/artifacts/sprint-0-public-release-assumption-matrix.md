# Sprint 0 Public Release Assumption Matrix

> **Status:** Frozen on 2026-04-11

This matrix records what the unification program currently assumes and what must
be true by the time the repository is treated as publicly release-ready.

## 1. Public Package Assumptions

| Area | Current baseline assumption | Current source | Public-release requirement | Planned sprint |
| --- | --- | --- | --- | --- |
| Contribution model | Public repo is issue-first and no-code-PR at this stage | `README.md`, `CONTRIBUTING.md` | public docs must keep that policy explicit until the maintainer changes it | 8 |
| Role model | public readers can inspect a five-role runtime, including `APPRENTICE` | runtime code and release inventory | docs and control planes must not omit real runtime roles | 1, 8 |
| Setup contract | outside users should be able to run the app from repo docs and `.env` guidance alone | `README.md`, operations docs | quick start must not rely on private deployment knowledge | 0, 8 |
| Release confidence | release evidence should be reproducible from repo commands | `package.json`, release scripts, release artifacts | unification work must join existing gates, not invent private verification | 0, 8 |
| Secret safety | repository artifacts should remain safe for source control and CI storage | `scripts/scan-secrets.mjs`, operations docs | no sprint may introduce secret-bearing artifacts or hidden credentials | all, especially 8 |
| Interruption semantics | public users may assume stop cancels all ongoing work | chat runtime research docs | public docs and UX language must not overstate what stop currently cancels until the contract is improved | 6, 8 |
| Service lifetime reasoning | outside readers should be able to understand where request scope, process cache, and in-memory coordination begin and end | service lifetime research docs | architecture docs must make lifetime classes explicit instead of relying on code archaeology | 6, 8 |
| MCP understanding | public readers should not need tribal knowledge to know whether MCP is primary architecture or an adapter layer | research docs and current `mcp/` layout | docs and boundary cleanup must explain MCP truthfully as thin wrapper target state | 7, 8 |
| Deployment notes | production-specific compose and host instructions can exist as operational notes | deployment memory notes | deployment-specific knowledge must not become a hidden prerequisite for local or OSS use | 0, 8 |

## 2. Current Hidden-Assumption Watchlist

These are the assumptions most likely to confuse a public reader if they are not
resolved or documented clearly.

| Assumption | Why it is risky publicly | Needed outcome |
| --- | --- | --- |
| Prompt admin and MCP are equivalent | they are not currently equivalent in side effects or role coverage | Sprint 1 must make equivalence real or explicitly document remaining limits |
| Prompt versions equal runtime prompt truth | they do not, because runtime also depends on fallback, config, and runtime sections | Sprint 2 must introduce effective prompt provenance |
| `prompt_version_changed` means the effective prompt changed | it currently refers only to a slot-version mutation path, not the full effective runtime prompt | Sprint 1 and Sprint 2 must keep event semantics and prompt provenance distinct |
| Passing route tests prove integrated chat behavior | current route tests still mock the most important split seams | Sprint 3 must add reduced-mock seam tests |
| Chat provider logic is centrally governed | it is currently duplicated across stream and direct-turn paths | Sprint 4 must define one shared provider-policy contract |
| Capability metadata is unified | it is still split across several registries | Sprint 5 must prove derivation on a real capability family |
| Deferred job state has one authoritative source | it currently converges from several channels and client rewrites | Sprint 6 must define a clearer publication story |
| Stop semantics cancel all in-flight or queued work | they currently stop the live stream only and depend on process-local active stream ownership | Sprint 6 and Sprint 8 must document or improve this contract clearly |
| Service lifetime boundaries are obvious from the code | current request-scoped, process-cached, and process-memory layers are mixed | Sprint 6 must publish an explicit lifetime map |
| MCP is already the primary app boundary | the app runtime is not currently MCP-first | Sprint 7 must thin MCP wrappers and clarify the architectural story |
| Public closeout is just lint, test, and build | public release also needs truthful docs, secret-safe artifacts, and residual-risk disclosure | Sprint 8 must formalize the closeout gate |

## 3. Freeze Rules For Later Sprints

Later sprints should follow these rules unless the unification spec is updated.

1. Do not assume a deployment-only fix is acceptable as a public contract.
2. Do not create artifacts that contain secrets, private hostnames, or
   environment values.
3. Do not let public docs claim an ideal architecture before the code and tests
   actually match it.
4. Do not treat open-source readiness as a documentation-only task; it is a
   release-gate task.
