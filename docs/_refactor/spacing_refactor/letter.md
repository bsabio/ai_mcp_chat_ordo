Here’s a letter you can give your coding agent.

---

**Letter to the coding agent**

You are being asked to research the Ordo codebase and produce a **detailed architecture/design spec** for spacing, layout rhythm, density, and visual hierarchy across the product shell. Your goal is **not** to jump straight to cosmetic edits. Your goal is to derive a **system-level spacing and layout contract** that can govern the application with precision, survive future feature growth, and yield a world-class interface. The existing code and specs already show both the right direction and the current weaknesses. The right approach is to identify those truths, consolidate them, and turn them into an explicit design-system spec.  

The first thing to understand is that there is a tension in the current system between **tokenized precision** and **local literal utility spacing**. In the shell/navigation surfaces, the code already uses named spacing primitives such as `gap-(--shell-rail-gap)`, `px-(--shell-nav-item-padding-inline)`, `py-(--shell-nav-item-padding-block)`, and `gap-(--shell-nav-item-gap)`, which is the correct general direction for a governed system. By contrast, other areas such as the admin journal surface still use literal values like `gap-8`, `gap-3`, `p-5`, `px-4`, and `py-3`. That mixed grammar is one of the main reasons the UI can feel coherent in places yet still slightly improvised overall. You should treat that inconsistency as a core design-system problem, not a series of isolated style choices.  

You must also respect the product’s current governing truth: **the archived Swiss layout work is not the active authority**. The repo explicitly says to preserve useful typography and spacing concepts only where they support the current chat-first interface, and to prefer active shell and Platform V1 specs for implementation decisions. So do not write a nostalgia spec for the older Swiss direction. Instead, extract what remains durable from that work—hierarchy, rhythm, page geometry, disciplined spacing—and reinterpret it inside the active chat-first shell. 

That said, the archived layout work is still valuable because it clearly identifies the unresolved problems. It states that the codebase still does not fully solve exact typographic scale for shell roles, precise horizontal and vertical rhythm across shell surfaces, hero-state composition rules distinct from conversation-state rules, and unified account-rail behavior across anonymous and authenticated states. It also correctly says that the product will continue to look improvised unless shell, hero stage, and account rail are governed by one precise contract. Preserve that diagnosis. It is still the right diagnosis even if the visual philosophy has since been superseded.

Your work should therefore begin with a **research and audit pass**, not implementation. I want you to inspect the current shell, homepage chat stage, account controls, admin surfaces, journal surfaces, jobs surfaces, and other recurring layout families. Build a map of where spacing is currently determined by:

1. semantic tokens,
2. component-local literal classes,
3. surface-level primitives, and
4. one-off optical fixes.
   The deliverable from that pass should be a **spacing/layout census** showing where the system already has structure and where it is drifting. Use the semantic-surface philosophy already present in the codebase as a guide; the repo explicitly frames “visual authority” as a manifest-backed system and says that high-leverage components should use named CSS primitives rather than ad hoc class hunting.

From there, I want you to produce a spec whose central claim is this:

**Ordo should use one governed spacing grammar based on semantic roles, not scattered utility choices.**

My recommendation is that you formalize a **single base unit**, a **small discrete spacing ladder**, and a **semantic role-token layer**. I do **not** want a system where people continue to choose `gap-3`, `gap-4`, `gap-5`, `gap-8`, `p-5`, `px-4`, `py-3`, and so on on a case-by-case basis. I want a system where spacing encodes relationship type and density state. That means you should define role families such as: stack spacing, cluster spacing, inset spacing, rail spacing, section spacing, and page-frame spacing. These should be represented as global tokens or semantically named primitives, not scattered literal utilities. This aligns with the archived spec’s “token-first implementation” requirement and with the active semantic-surface direction already present in the codebase. 

I specifically want you to challenge one idea that appears in the prior internal writeup: the claim that the Phi / Golden Ratio scale should be the default answer for spacing. The system notes say spacing is currently governed by a Phi scale for harmony, but my judgment is that **Phi should not be the everyday implementation rule for interface spacing**. It may remain useful as a macro-compositional influence or as inspiration for a few larger proportional relationships, but the professional, cognitively stable solution for this application is a strict modular spacing ladder with semantic tokens. The product needs repeatability, hierarchy, grouping clarity, and disciplined density more than it needs mystical proportionality. Treat Phi as an optional compositional lens, not the primary operational grammar.

Your spec must also preserve the boundaries established by the homepage shell work. The homepage shell specs and sprint docs are clear that ownership of stage/scroll/composer behavior is already defined elsewhere, that polish work should remain narrow, and that spacing refinements must not reopen shell ownership, footer composition, or navigation scope. In other words: your work is to define the visual contract that sits on top of those architectural boundaries, not to casually redesign page behavior.

Here is the design philosophy I want you to aim for:

* spacing should express **meaning**, not whim
* tighter spacing means “belongs together”
* wider spacing means “new conceptual block”
* density should be controlled through a **small set of allowed modes**
* components should inherit spacing behavior from role tokens rather than inventing their own micro-systems
* the shell should feel like one authored language from nav rail to hero stage to account controls to admin tools

This is what will make the system feel mathematically precise, aesthetically calm, and cognitively correct.

Your spec should include at least these sections:

**1. Problem statement**
State that the product currently mixes semantic/tokenized spacing with literal utility spacing, creating drift and weakening hierarchy. Cite concrete examples from shell/navigation versus admin/journal surfaces.  

**2. Governing constraints**
State clearly that Platform V1 and active shell specs govern current implementation, while the archived Swiss work is provenance only. Preserve useful ideas, but do not restore the archived design wholesale. 

**3. Layout grammar**
Define the base unit, spacing ladder, semantic role categories, density modes, and any allowable exceptions. Explain the intended relationship between modular spacing and typography rhythm.

**4. Surface taxonomy**
Map shell rail, homepage hero, conversation view, account rail, menu/dropdown surfaces, admin lists/forms, and card-based panels into a shared spacing language.

**5. Token contract**
Define exact token names, ownership location, inheritance rules, and when raw utility classes are forbidden. This should live at the global/system level, not inside random components. The archived spec explicitly wanted shell and hero precision tokens in `globals.css` rather than component-local classes; preserve that principle, but reframe it under the active product direction. 

**6. Migration strategy**
Propose a phased transition: first shell and shared surfaces, then admin/journal/jobs surfaces, then lower-priority exceptions. The current report already recommended semantic completion for journal and sidebar-like surfaces; use that as supporting direction. 

**7. Verification strategy**
I want more than visual opinion. Define regression-visible markers where practical: role classes, data attributes, token usage audits, snapshot or browser QA evidence, and lintable rules against unauthorized literal spacing. The archived spec explicitly called for regression visibility and browser-safe refinement; preserve that rigor. 

Your implementation recommendations should be conservative and system-first:

* prefer **global tokens and semantic primitives**
* ban or sharply limit raw spacing literals in app-level surfaces
* allow only narrowly justified optical overrides
* do not reopen shell ownership or page architecture
* convert ad hoc surfaces into the same authored spacing language as the shell
* favor a few density states over endless local tuning

Do not give me a vague aesthetic memo. Give me a **real spec** with requirement IDs, affected files, migration sequencing, anti-goals, and acceptance criteria.

The bar here is not “clean it up.”
The bar is to create a spacing and layout system that feels **inevitable**—calm, disciplined, legible, scalable, and worthy of a world-class product. The architecture is already strong enough that the visual system can no longer be allowed to feel incidental. Your task is to make the visual contract as rigorous as the underlying software contract.

