# Studio Ordo Platform V1 — Deployable Chat-First AI Business System

> **Status:** Draft (v0.2 — updated post-V0)
> **Date:** 2026-03-22 (updated 2026-03-23)
> **V0 Baseline:** 1194 tests, 175 suites, build clean. See §1.5 for V0 deliverables.
> **Scope:** Transform Studio Ordo from a solo consulting tool into a configurable, deployable, chat-only AI business system that students can fork, configure, and deploy for real businesses.
> **Requirement IDs:** `PLAT-001` through `PLAT-099`
> **Dependencies:** [Platform V0](../platform-v0/spec.md) (foundational refactors), [RBAC](../rbac/spec.md), [Tool Architecture](../tool-architecture/spec.md), [Interactive Chat Actions](../interactive-chat-actions/spec.md), [Vector Search](../vector-search/spec.md), [Deferred Job Orchestration](../deferred-job-orchestration/spec.md)
> **Supersedes:** [Dashboard AI Action Workspace](../dashboard-ai-action-workspace/), [Dashboard RBAC Blocks](../dashboard-rbac-blocks/), [Swiss Layout Precision](../swiss-layout-precision/)
> **Implementation note (2026-03-24):** Sprint 2 dashboard elimination is complete, and the later TD-C4 convergence cleanup also finished. Active runtime no longer preserves a `src/lib/dashboard/` compatibility layer; the surviving business logic now lives under `src/lib/operator/`, and the handoff path is canonicalized as `src/lib/chat/task-origin-handoff.ts`.
> **Implementation note (2026-03-25):** Phase C is substantially present in the active codebase: public blog routes, sitemap/robots generation, analytics script wiring, admin blog drafting and publishing tools, and the shared deferred-jobs queue used by blog drafting are all implemented. The next major unmet Platform V1 sprint is Sprint 8 booking.

---

## §0 Product Vision

Studio Ordo is a **deployable chat-first AI business system**. It is the operating system for a solo AI consulting practice.

The founder uses it. Students learn from it. Graduates fork it and deploy it for real businesses. Every deployed instance is a working AI front door — chat-driven, phone-first, capable of qualifying leads, serving content, booking appointments, and tracking referrals.

### Three audiences, one codebase

| Audience | Relationship to the system |
| --- | --- |
| **Founder (Keith)** | Runs the flagship instance at studioordo.com |
| **BSEAI students** | Learn agentic orchestration by using and studying the system |
| **Graduates / deployers** | Fork, configure, and deploy instances for real businesses in the NYC metro market |

### The guild model

Students graduating from NJIT's BS in Enterprise AI program carry QR codes on their business cards. When scanned, the QR code opens the Studio Ordo chat with referral attribution. The AI greets the visitor by referencing the student who introduced them. The system handles intake, qualification, and booking. The student doesn't need to sell — the system sells. The student configures and deploys.

### Design philosophy

The product follows a calculator pedagogy: the user sees 4 buttons, but the architecture underneath is what teaches. The chat is the single interface. Everything else — CRM, analytics, booking, content management, referral tracking — is hidden behind MCP tools that the AI invokes. The user never sees the complexity. They just have a conversation. This also prepares the system for voice interfaces, where a single conversational channel is the only input.

---

## §1 Problem Statement

### §1.1 Current state

Studio Ordo is a functioning Next.js application with real auth, real streaming chat, real tool orchestration, and a 145-file content corpus. **Platform V0** completed four foundational refactors — SystemPromptBuilder, User Preferences Persistence, Single Continuous Conversation, and Chat Surface Unification — establishing a unified chat architecture with 1194 passing tests across 175 suites. However, it still has structural problems that prevent it from fulfilling its product vision.

### §1.2 Verified issues

| # | Issue | Evidence | Impact |
| --- | --- | --- | --- |
| 1 | **Identity crisis** | Package named `is601_demo`. README says "teaching repo." Metadata says "Strategic AI Advisory." | Confuses every audience. A client sees homework. A student sees a CRM. |
| 2 | **No front door** | Homepage renders `<ChatSurface mode="embedded" />` with a hero BrandHeader and bootstrap suggestions, but no configurable greeting and no referral awareness. *(V0 Sprint 4 unified the surface; V1 adds config-driven first message and referral personalization.)* | First-time visitors from QR codes, LinkedIn, or search land on a branded hero but receive no personalized or context-aware greeting. |
| 3 | **Content locked behind LLM** | 145 corpus files are accessible via the `search_corpus` tool and via `/library` and `/corpus` routes (added pre-V1), but there is no sitemap, no blog, and no SEO metadata on content pages. | The content is browsable but invisible to search engines. |
| 4 | **Zero measurement** | No analytics, no sitemap.xml, no robots.txt, no OG tags beyond root layout. | All product, attribution, and conversion decisions are guesswork. |
| 5 | **Over-built back office** | 11-block dashboard with focus system, grid layout, and 1500+ lines of UI code. Zero external users. | Engineering invested in operating a business that has no acquisition funnel. |
| 6 | **No path from interest to money** | `deal_records.estimated_price` exists but no booking mechanism, no Stripe integration, no scheduling. | The pipeline ends at a founder_note in a SQLite row. |
| 7 | **Eight font families** | Layout loads Geist, Geist Mono, Archivo, League Spartan, IBM Plex Sans, IBM Plex Mono, Fraunces, Space Mono. | Unnecessary latency, download weight, and design indecision. |
| 8 | **Everything hardcoded** | Brand name, corpus config, shell routes, metadata — all in TypeScript source files. System prompts are now built via `SystemPromptBuilder` (V0 Sprint 1) with extension points, but identity and tool config remain hardcoded. | A student cannot deploy for a dental practice without editing 15+ source files. |
| 9 | **No referral tracking** | No QR code generation, no `?ref=` parameter handling, no affiliate attribution. | The primary distribution mechanism (students with business cards) has no technical support. |
| 10 | **Dashboard competes with chat** | Dashboard is a separate page with its own data loaders, block components, and interaction model. | Two competing modalities. The chat-first strategy is undermined by a traditional dashboard. |

### §1.3 Root cause

The system was built as a solo consulting tool with a teaching overlay. It needs to become a configurable platform that teaches by being deployable.

### §1.4 Why it matters

Without these changes, Studio Ordo cannot serve its three audiences. The founder has no acquisition funnel. The students have no deployable product. The graduates have no business tool to configure for clients. The content corpus — the system's largest asset — generates zero organic traffic.

### §1.5 V0 Foundation (completed)

Platform V0 delivered four foundational refactors that V1 builds on. All are merged and tested (1194 tests, 175 suites, zero failures).

| V0 Sprint | Deliverable | Key artifacts | V1 impact |
| --- | --- | --- | --- |
| **1 — SystemPromptBuilder** | Composable prompt assembly via builder pattern. `withIdentity()`, `withRoleDirective()`, `withUserPreferences()`, `withConversationSummary()`, `withSection()`, `build()`. | `src/core/use-cases/SystemPromptBuilder.ts`, factory in `src/lib/chat/policy.ts` | V1 config layer (§3.2) plugs `identity.json` and `prompts.json` into the existing builder — no new prompt infrastructure needed. |
| **2 — User Preferences** | Per-user key/value preferences persisted to SQLite. Full CRUD adapter. | `user_preferences` table in `src/lib/db/schema.ts`, `src/adapters/UserPreferencesDataMapper.ts` | V1 theme/UI preferences tools can write to an existing table — no schema migration needed. |
| **3 — Single Conversation** | One active conversation per user, reused across sessions. `ConversationInteractor.ensureActive()` is the canonical API. "New Chat" removed. | Single-conversation logic in interactor, conversation summary/archival support | V1 first-message greeting (§8 Sprint 3) injects into the single conversation model — no multi-conversation edge cases. |
| **4 — Chat Surface Unification** | `ChatSurface` component replaces `ChatContainer`, `FloatingChatShell`, and `GlobalChat`. One component, two modes: `mode="embedded"` (homepage) and `mode="floating"` (FAB panel). | `src/frameworks/ui/ChatSurface.tsx`, `ChatSurfaceHeader.tsx`, `useChatSurfaceState.tsx`, `FloatingChatFrame.tsx` | V1 config-driven identity (§4.2) modifies `ChatSurface` and `MessageList` — not the deleted components. File references in this spec reflect the post-V0 architecture. |

**Deleted by V0 (no longer in codebase):** `ChatContainer.tsx`, `FloatingChatShell.tsx`, `GlobalChat.tsx`, `FloatingChatHeader.tsx` and their test files.

**Library routes pre-exist:** `/library` and `/corpus` routes exist at `src/app/library/` and `src/app/corpus/` (created before V0). V1 Sprint 5 adds SEO metadata, JSON-LD, and sitemap integration to these existing routes rather than creating them from scratch.

---

## §2 Design Goals

1. **Chat is the only interface.** There is one screen: the conversation. All business capabilities — lead management, analytics, booking, content management — are MCP tools invoked by the AI and rendered as rich messages using the existing ICA system. [PLAT-001]
2. **Phone-first.** Every interaction must work on a mobile viewport. No hover-dependent interactions. No multi-column layouts in the chat. Touch targets meet 44px minimum. [PLAT-002]
3. **The AI speaks first.** When a visitor arrives, the chat contains a pre-loaded greeting from the system. The greeting is configurable and context-aware (referral attribution, time of day, return visitor). [PLAT-003]
4. **QR codes are the distribution engine.** Every authenticated user can optionally receive a referral QR code. Scanned codes attribute the resulting conversation to the referrer. The AI personalizes the greeting. Admins control who gets affiliate status. [PLAT-004]
5. **Content is public and indexable.** Corpus documents render as public web pages. They produce a sitemap.xml, have OG tags, and are browsable without authentication. The corpus is both the LLM's knowledge base and the SEO engine. [PLAT-005]
6. **Configuration, not code changes.** Brand identity, system prompts, service offerings, active tools, and corpus content are externalized into config files and the corpus directory. A deployer configures an instance by editing config and dropping in content — not by modifying TypeScript. [PLAT-006]
7. **Deal-based, not subscriptions.** Revenue comes from scoped engagements — advisory sprints, training intensives, supervised implementation. The system tracks deals, not recurring billing. Stripe integration is a payment-link placeholder, not a subscription engine. [PLAT-007]
8. **Booking is conversational.** When the AI determines a conversation is ready for scheduling, it invokes a booking MCP tool. The tool creates a structured booking request that the admin sees in chat. No external calendar dependency required for v1. [PLAT-008]
9. **Analytics are built in.** Lightweight, privacy-respecting analytics (Plausible) track page views, referral sources, and conversion events. The AI can query analytics data via admin tools. [PLAT-009]
10. **Forkable by students.** A BSEAI graduate can fork the repository, edit config files, drop in a client's content, and deploy a working instance via Docker. The core engine is the base image. The customization is config + corpus. [PLAT-010]
11. **Minimal font stack.** The system uses exactly three font families: one sans-serif body, one display/heading, and one monospace for code. [PLAT-011]
12. **Architectural integrity.** All changes follow Clean Architecture layering, GoF patterns, SOLID principles, and Knuth-level performance discipline. Technical debt sprints enforce this with formal audits. [PLAT-012]

---

## §3 Architecture

### §3.1 System overview

```text
┌─────────────────────────────────────────────────────┐
│                    VISITOR                           │
│  (scans QR code, finds via search, direct link)     │
└───────────────┬─────────────────────────────────────┘
                │ ?ref=maria-chen
                ▼
┌─────────────────────────────────────────────────────┐
│               CHAT INTERFACE                         │
│  (single page, phone-first, pre-loaded greeting)    │
│  ┌───────────────────────────────────────────────┐  │
│  │ "Welcome — I see you were introduced by       │  │
│  │  Maria Chen, an Enterprise AI practitioner..." │  │
│  │                                                │  │
│  │  [Maria mentioned you could help]              │  │
│  │  [I'm interested in AI for my business]        │  │
│  │  [I want to learn AI orchestration]            │  │
│  └───────────────────────────────────────────────┘  │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│              MCP TOOL LAYER                          │
│                                                      │
│  Corpus Tools    │  Business Tools   │  Admin Tools  │
│  ─────────────   │  ──────────────   │  ──────────── │
│  search_corpus   │  request_booking  │  show_pipeline│
│  get_section     │  capture_contact  │  show_referrals│
│  get_summary     │  create_deal      │  show_analytics│
│                  │                   │  manage_content│
│  UI Tools        │  Referral Tools   │  manage_users │
│  ─────────────   │  ──────────────   │               │
│  set_theme       │  generate_qr      │               │
│  navigate        │  my_referrals     │               │
│  adjust_ui       │                   │               │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│              DATA LAYER (SQLite)                     │
│                                                      │
│  conversations  │  deal_records      │  referrals    │
│  messages       │  lead_records      │  booking_reqs │
│  users/roles    │  training_paths    │  analytics    │
│  embeddings     │  consultation_reqs │  payment_links│
│  system_prompts │  corpus index      │               │
└─────────────────────────────────────────────────────┘
```

### §3.2 Configuration layer

All instance-specific values move to config files loaded at startup. The runtime reads config once and caches it.

```text
config/
├── identity.json        # brand name, tagline, description, colors, logo path
├── prompts.json         # first-message template, system prompt overrides, role directives
├── services.json        # service offerings, pricing tiers, deal templates
└── tools.json           # which MCP tools are active for this instance
```

**identity.json schema:**

```typescript
interface InstanceIdentity {
  name: string;                    // "Studio Ordo"
  shortName: string;               // "Ordo"
  tagline: string;                 // "Strategic AI Advisory"
  description: string;             // SEO meta description
  domain: string;                  // "studioordo.com"
  logoPath: string;                // "/logo.png"
  markText: string;                // "O"
  accentColor: string;             // oklch color value
  fonts: {
    body: string;                  // Google Font family name
    display: string;               // Google Font family name
    mono: string;                  // Google Font family name
  };
}
```

**prompts.json schema:**

```typescript
interface InstancePrompts {
  firstMessage: {
    default: string;               // greeting when no referral
    withReferral: string;          // template: "Welcome — I see you were introduced by {{referrer.name}}..."
  };
  defaultSuggestions: string[];    // initial suggestion chips
  referralSuggestions: string[];   // suggestion chips when referred
  systemPromptOverride?: string;   // full override (optional — falls back to corpus-derived prompt)
  personality?: string;            // appended to system prompt for tone/style
}
```

**services.json schema:**

```typescript
interface InstanceServices {
  offerings: Array<{
    id: string;                    // "strategy-sprint"
    name: string;                  // "AI Strategy and Workflow Architecture Sprint"
    description: string;           // what the client gets
    lane: "organization" | "individual" | "both";
    estimatedPrice?: number;       // base price in cents
    estimatedHours?: number;       // typical hours
  }>;
  bookingEnabled: boolean;
  stripePaymentLinks?: Record<string, string>;  // offering id → Stripe payment link URL
}
```

**tools.json schema:**

```typescript
interface InstanceTools {
  enabled: string[];               // tool IDs to activate: ["search_corpus", "request_booking", ...]
  disabled: string[];              // explicit disables (override defaults)
}
```

### §3.3 Referral and QR code system

**New database table:**

```sql
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_user_id TEXT NOT NULL,
  conversation_id TEXT,
  referral_code TEXT NOT NULL UNIQUE,
  scanned_at TEXT,
  converted_at TEXT,
  outcome TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (referrer_user_id) REFERENCES users(id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_conversation ON referrals(conversation_id);
```

**New column on users:**

```sql
ALTER TABLE users ADD COLUMN affiliate_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE DEFAULT NULL;
```

**Flow:**

1. Admin enables affiliate for a user: sets `affiliate_enabled = 1`, generates unique `referral_code`
2. User requests QR code → system generates QR encoding `https://{domain}/?ref={referral_code}`
3. Visitor scans QR → app reads `?ref` param in middleware, stores in cookie
4. Conversation created → `referral_source` column set, row inserted into `referrals` table
5. First message personalized with referrer's name and credential
6. Referral tracked through to deal outcome

### §3.4 Public content routes

Corpus documents become public web pages. The `/library` and `/corpus` routes already exist (pre-V1) with basic rendering. V1 adds SEO infrastructure:

```text
/library                    → index of all domains (books)
/library/{domain}           → domain chapter list
/library/{domain}/{chapter} → rendered chapter content
/blog                       → reverse-chronological content feed
/blog/{slug}                → individual blog post
/sitemap.xml                → auto-generated from published content
/robots.txt                 → allow all public content routes
```

Each page includes:

- OG title, description, image tags
- Canonical URL
- JSON-LD structured data (Article schema)
- Link to chat: "Have questions about this topic? Ask the AI."

### §3.5 Booking system

**New database table:**

```sql
CREATE TABLE IF NOT EXISTS booking_requests (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  user_id TEXT,
  contact_name TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  preferred_times TEXT DEFAULT NULL,
  service_id TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_booking_conversation ON booking_requests(conversation_id);
CREATE INDEX IF NOT EXISTS idx_booking_status ON booking_requests(status);
```

**MCP tool:** `request_booking` — invoked by the AI when the conversation reaches scheduling readiness. Collects contact info, topic, and preferred times. Creates a `booking_request` record. Renders a confirmation message with ICA action links.

### §3.6 Stripe placeholder

**New database table:**

```sql
CREATE TABLE IF NOT EXISTS payment_links (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  stripe_payment_link_url TEXT NOT NULL,
  amount_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'usd',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Payment links are stored in the database and surfaced in `services.json`. When a deal reaches "agreed" status, the AI can surface the relevant payment link as an ICA action link. No Stripe SDK integration in v1 — just URL storage and presentation.

### §3.7 Dashboard elimination

The dashboard page and all block components are removed. Their data-loading logic migrates to MCP tools:

| Current dashboard block | Becomes MCP tool | Invoked by |
| --- | --- | --- |
| `ConversationWorkspace` | `show_active_conversations` | Admin chat: "show my active conversations" |
| `DealQueue` | `show_pipeline` | Admin chat: "what deals need attention?" |
| `LeadQueue` | `show_leads` | Admin chat: "show new leads" |
| `ConsultationRequests` | `show_consultations` | Admin chat: "any consultation requests?" |
| `RecentConversations` | `show_recent_conversations` | Admin chat: "what happened today?" |
| `SystemHealth` | `show_system_health` | Admin chat: "system status" |
| `FunnelRecommendations` | `show_funnel_insights` | Admin chat: "how's the funnel?" |
| `TrainingPathQueue` | `show_training_paths` | Admin chat: "training pipeline" |
| `AnonymousOpportunities` | `show_anonymous_signals` | Admin chat: "any anonymous opportunities?" |
| `RecurringPainThemes` | `show_market_themes` | Admin chat: "what themes are you seeing?" |
| `RoutingReview` | `show_routing_review` | Admin chat: "routing review" |

Each tool returns structured data that the ICA rich content renderer already supports: tables, sections, operator briefs, action links.

### §3.8 Role model update

| Role | Access | New capabilities |
| --- | --- | --- |
| `ANONYMOUS` | Chat, experience intake, access public content | Referral attribution on conversation |
| `AUTHENTICATED` | Save conversations, access corpus, free tier | — |
| `APPRENTICE` (new) | All AUTHENTICATED + referral QR code + see their referrals + get assigned work | `generate_qr`, `my_referrals`, `my_assignments` tools |
| `ADMIN` | Everything + deal management + user management + analytics + content management | All admin tools, affiliate management |

### §3.9 Font reduction

Current: 8 families (Geist, Geist Mono, Archivo, League Spartan, IBM Plex Sans, IBM Plex Mono, Fraunces, Space Mono).

Target: 3 families.

| Purpose | Font | Variable |
| --- | --- | --- |
| Body | IBM Plex Sans | `--font-body` |
| Display | Fraunces | `--font-display` |
| Mono | IBM Plex Mono | `--font-mono` |

Rationale: IBM Plex Sans is the most readable body font already loaded. Fraunces provides editorial contrast for headings. IBM Plex Mono maintains the monospace consistency. All other font declarations, CSS variables, and `next/font` imports are removed.

These defaults are overridable via `identity.json` for deployers who want different typography.

---

## §4 File Plan

### §4.1 New files

| File | Layer | Purpose |
| --- | --- | --- |
| `config/identity.json` | Config | Brand name, tagline, colors, fonts, logo |
| `config/prompts.json` | Config | First message, suggestions, personality |
| `config/services.json` | Config | Service offerings, pricing, Stripe links |
| `config/tools.json` | Config | Active/disabled tool list |
| `src/lib/config/instance.ts` | Lib | Loader + typed accessor for config files |
| `src/lib/config/instance.schema.ts` | Core | Zod or runtime validation schemas for config |
| `src/core/entities/Referral.ts` | Core | Referral domain entity |
| `src/core/entities/BookingRequest.ts` | Core | Booking request domain entity |
| `src/core/entities/PaymentLink.ts` | Core | Payment link domain entity |
| `src/core/use-cases/GenerateReferralQR.ts` | Core | QR code generation use case |
| `src/core/use-cases/TrackReferral.ts` | Core | Referral attribution use case |
| `src/core/use-cases/CreateBookingRequest.ts` | Core | Booking creation use case |
| `src/adapters/ReferralDataMapper.ts` | Adapter | Referral SQL ↔ domain mapping |
| `src/adapters/BookingRequestDataMapper.ts` | Adapter | Booking SQL ↔ domain mapping |
| `src/adapters/PaymentLinkDataMapper.ts` | Adapter | Payment link SQL ↔ domain mapping |
| `src/app/library/page.tsx` | App | Public corpus index *(already exists — V1 adds SEO metadata, OG tags, JSON-LD)* |
| `src/app/library/[domain]/page.tsx` | App | Public domain chapter list *(already exists as `[document]/page.tsx` — V1 adds SEO metadata)* |
| `src/app/library/[domain]/[chapter]/page.tsx` | App | Public chapter rendering *(already exists as `[document]/[section]/page.tsx` — V1 adds SEO metadata)* |
| `src/app/blog/page.tsx` | App | Blog index (reverse-chronological) |
| `src/app/blog/[slug]/page.tsx` | App | Individual blog post |
| `src/app/sitemap.ts` | App | Next.js sitemap generation |
| `src/app/robots.ts` | App | Next.js robots.txt generation |
| `src/app/api/qr/[code]/route.ts` | App | QR code image generation endpoint |
| `mcp/booking-tool.ts` | MCP | Booking request MCP tool |
| `mcp/referral-tool.ts` | MCP | QR generation + referral query MCP tool |
| `mcp/admin-pipeline-tool.ts` | MCP | Pipeline/leads/deals query tool (replaces dashboard) |
| `mcp/admin-analytics-tool.ts` | MCP | Analytics query tool |
| `mcp/admin-content-tool.ts` | MCP | Content drafting + publishing tool |
| `public/robots.txt` | Static | Fallback robots.txt |

### §4.2 Modified files

| File | Change |
| --- | --- |
| `src/app/layout.tsx` | Read identity from config. Reduce to 3 font imports. Dynamic metadata. |
| `src/app/page.tsx` | Pre-loaded first message from config. Referral param handling. *(Currently renders `<ChatSurface mode="embedded" />` with hero BrandHeader from V0 Sprint 4.)* |
| `src/app/globals.css` | Remove unused font variables. Simplify to 3-font token system. |
| `src/lib/shell/shell-navigation.ts` | Read brand from config instead of hardcoded constant. Remove dashboard route. |
| `src/lib/corpus-config.ts` | Read corpus metadata from config or derive from filesystem scan. |
| `src/lib/db/schema.ts` | Add `referrals`, `booking_requests`, `payment_links` tables. Add `affiliate_enabled` and `referral_code` to users. Add `referral_source` to conversations. Add `APPRENTICE` role seed. *(Note: `user_preferences` table already exists from V0 Sprint 2.)* |
| `src/lib/chat/policy.ts` | Read system prompt from config with fallback to current hardcoded prompt. *(Already uses `SystemPromptBuilder` from V0 Sprint 1 — V1 feeds config values into the existing builder.)* |
| `src/lib/chat/tools.ts` | Respect `tools.json` enabled/disabled list. Register new tools. |
| `src/proxy.ts` | Parse `?ref=` param, set referral cookie. *(Edge proxy — not `src/middleware.ts`. V1 adds referral handling to the existing proxy or creates a Next.js middleware wrapper.)* |
| `src/components/shell/ShellBrand.tsx` | Read brand name, logo from config. |
| `src/frameworks/ui/MessageList.tsx` | Replace hardcoded "Studio Ordo" with config-driven name. Support pre-loaded first message. |
| `src/frameworks/ui/ChatContentSurface.tsx` | Support hero state with pre-loaded message (not empty). *(Hero BrandHeader with service chips and bootstrap suggestions already exists from V0 Sprint 4. V1 makes the greeting config-driven.)* |
| `src/hooks/useGlobalChat.tsx` | Initialize with first message when no conversation exists. *(Note: file extension is `.tsx`, not `.ts`.)* |
| `src/frameworks/ui/FloatingChatLauncher.tsx` | Read aria-label from config. |
| `compose.yaml` | Add config volume mount. |
| `Dockerfile` | Copy config directory into image. |
| `package.json` | Rename from `is601_demo` to `studio-ordo`. Add QR code generation dependency. |

### §4.3 Deleted files

| File | Reason |
| --- | --- |
| `src/app/dashboard/page.tsx` | Dashboard eliminated — capabilities move to admin chat tools. |
| `src/app/dashboard/page.test.tsx` | Test for deleted page. |
| `src/components/dashboard/ConversationWorkspaceBlock.tsx` | Dashboard block → admin MCP tool. |
| `src/components/dashboard/DealQueueBlock.tsx` | Dashboard block → admin MCP tool. |
| `src/components/dashboard/LeadQueueBlock.tsx` | Dashboard block → admin MCP tool. |
| `src/components/dashboard/ConsultationRequestsBlock.tsx` | Dashboard block → admin MCP tool. |
| `src/components/dashboard/RecentConversationsBlock.tsx` | Dashboard block → admin MCP tool. |
| `src/components/dashboard/SystemHealthBlock.tsx` | Dashboard block → admin MCP tool. |
| `src/components/dashboard/FunnelRecommendationsBlock.tsx` | Dashboard block → admin MCP tool. |
| `src/components/dashboard/TrainingPathQueueBlock.tsx` | Dashboard block → admin MCP tool. |
| `src/components/dashboard/AnonymousOpportunitiesBlock.tsx` | Dashboard block → admin MCP tool. |
| `src/components/dashboard/RecurringPainThemesBlock.tsx` | Dashboard block → admin MCP tool. |
| `src/components/dashboard/RoutingReviewBlock.tsx` | Dashboard block → admin MCP tool. |
| `src/components/dashboard/CustomerWorkflowContinuityBlock.tsx` | Dashboard block → admin MCP tool. |
| `src/components/dashboard/DashboardQuestionChips.tsx` | Dashboard question chip UI. |
| `src/components/dashboard/DashboardAIActionButton.tsx` | Dashboard AI action button UI. |
| `src/lib/dashboard/dashboard-blocks.ts` | Dashboard infrastructure. |
| `src/lib/dashboard/dashboard-visibility.ts` | Dashboard infrastructure. |
| `src/lib/dashboard/dashboard-focus.ts` | Dashboard infrastructure. |
| `src/lib/dashboard/dashboard-chat-intents.ts` | Dashboard infrastructure. |
| `src/lib/dashboard/dashboard-ordering.ts` | Dashboard infrastructure. |
| `src/components/GridInspector.tsx` | Developer tool, not user-facing. |
| `src/components/CommandPalette.tsx` | Developer tool, not needed in chat-only model. |

> **Note:** The former dashboard data loaders have been fully converged into the operator-owned backend under `src/lib/operator/`. The SQL queries and business logic survive, but the dashboard compatibility layer no longer exists in active runtime code.

---

## §5 Design Patterns Applied

| Pattern | Source | Application |
| --- | --- | --- |
| **Strategy** (GoF) | Config-driven prompt selection, tool activation | Instance config determines which strategies are active at runtime |
| **Template Method** (GoF) | First message rendering | Base greeting template with referral/default variants |
| **Abstract Factory** (GoF) | Tool registry | Config-driven factory produces only the tools listed in `tools.json` |
| **Observer** (GoF) | Referral tracking | Conversation creation event triggers referral attribution |
| **Facade** (GoF) | Instance config loader | Single `getInstanceConfig()` call hides multi-file config loading |
| **Repository** (PoEAA) | New data mappers | Referral, BookingRequest, PaymentLink repositories |
| **Data Mapper** (PoEAA) | SQL ↔ domain | Consistent with existing adapters pattern |
| **Composition Root** (Martin) | Config loading at startup | All wiring happens at composition root, not scattered through modules |
| **Dependency Inversion** (Martin) | Config interfaces | Core depends on abstractions; config files are infrastructure detail |
| **Single Responsibility** (Martin) | One config file per concern | Identity, prompts, services, tools each have their own file |
| **Open/Closed** (Martin) | Tool registry | New tools added via config without modifying registry code |

---

## §6 Security And Access

### §6.1 RBAC matrix

| Capability | ANONYMOUS | AUTHENTICATED | APPRENTICE | ADMIN |
| --- | --- | --- | --- | --- |
| Chat | Yes | Yes | Yes | Yes |
| View public content | Yes | Yes | Yes | Yes |
| Save conversations | No | Yes | Yes | Yes |
| Access corpus via tools | Limited | Full | Full | Full |
| Generate QR code | No | No | Yes (if affiliate enabled) | Yes |
| View own referrals | No | No | Yes | Yes |
| View assigned work | No | No | Yes | Yes |
| Request booking | No | Yes | Yes | Yes |
| View all leads/deals | No | No | No | Yes |
| Manage affiliates | No | No | No | Yes |
| Manage content | No | No | No | Yes |
| View analytics | No | No | No | Yes |
| Manage payment links | No | No | No | Yes |

### §6.2 Security constraints

1. **Referral codes are opaque.** They must not encode user IDs or be sequential. Use cryptographically random tokens (16+ bytes, base62 encoded). [PLAT-020]
2. **QR code endpoint is rate-limited.** The `/api/qr/[code]` endpoint must not allow enumeration or abuse. Rate limit to 60 requests/minute per IP. [PLAT-021]
3. **Config files are read-only at runtime.** The application reads config at startup and caches it. No runtime mutation of config files. [PLAT-022]
4. **Payment links are admin-only.** Only ADMIN role can create, modify, or delete payment links. The AI can surface them but not create them without admin context. [PLAT-023]
5. **Content publishing requires admin review.** AI-drafted content is stored as draft. Publishing requires explicit admin action. [PLAT-024]
6. **Booking requests validate email format.** Contact email must pass format validation before persistence. No open relay. [PLAT-025]
7. **Public content routes do not expose draft content.** Only published corpus files and blog posts appear in public routes and sitemap. [PLAT-026]
8. **Affiliate status is admin-gated.** Users cannot self-enable affiliate status. Only ADMIN can toggle `affiliate_enabled`. [PLAT-027]
9. **Domain safety on AI-generated content.** The system prompt for content drafting must include guardrails preventing generation of medical, legal, or financial advice regardless of instance configuration. These guardrails are in the core, not in config. [PLAT-028]

---

## §7 Testing Strategy

### §7.1 Unit tests

| Area | Estimated count | What's tested |
| --- | --- | --- |
| Config loader + validation | 45 | Schema validation, missing fields, defaults, overrides, edge cases, integration (see [Sprint 0 spec](sprint-0.md) §5) |
| Referral entities + use cases | 12 | Code generation, attribution, QR URL construction |
| Booking entities + use cases | 10 | Request creation, validation, status transitions |
| Payment link entities | 6 | CRUD, active/inactive filtering |
| Font reduction | 4 | CSS variable resolution, font-family cascade |
| First message rendering | 8 | Default greeting, referral greeting, template interpolation |
| Tool config filtering | 8 | Enabled/disabled lists, unknown tool handling |

### §7.2 Integration tests

| Area | Estimated count | What's tested |
| --- | --- | --- |
| Referral flow end-to-end | 6 | QR scan → cookie → conversation → attribution → deal |
| Booking flow end-to-end | 5 | Chat → tool invocation → record creation → admin notification |
| Public content routes | 8 | Library index, domain page, chapter page, OG tags, sitemap |
| Admin MCP tools | 12 | Each dashboard-replacement tool returns correct data |
| Config-driven identity | 5 | Brand name, logo, metadata all reflect config |
| RBAC for new role | 6 | APPRENTICE tool access, affiliate gating |

### §7.3 Existing test preservation

Current suite: 1373 tests across 167 suites (post-S6). All tests must remain green. Running total through S6: 1194 (V0) → 1244 (S0, +50) → 1266 (S1, +22) → 1215 (S2, -51) → 1239 (TD-A, +24) → 1267 (S3, +28) → 1311 (S4, +44) → 1336 (S5, +25) → 1351 (TD-B, +15) → 1373 (S6, +22).

---

## §8 Sprint Plan

### Phase A: Simplify and configure (foundation)

| Sprint | Name | Goal | Estimated tests |
| --- | --- | --- | --- |
| **0** | **Config Layer and Identity** | Externalize brand, prompts, services, and tool config into JSON files. Build typed loader with validation. Replace all hardcoded identity references. Rename package. See [Sprint 0 spec](sprint-0.md). | +50 |
| **1** | **Font Reduction and CSS Cleanup** | Reduce to 3 font families. Remove unused font imports, CSS variables, and typographic tokens. Update all component references. | +22 |
| **2** | **Dashboard Elimination** | Delete dashboard page and all block components. Redirect `/dashboard` to `/`. Remove GridInspector and CommandPalette. Preserve the business logic for later migration into chat-native operator tooling. | -51 |
| **TD-A** | **Technical Debt: Booch Object Audit** | Audit all new and modified classes for Booch object model compliance: clear abstraction boundaries, minimal public interfaces, proper encapsulation, cohesive class responsibilities. Refactor violations. | +24 |

### Phase B: Front door and referrals

| Sprint | Name | Goal | Estimated tests |
| --- | --- | --- | --- |
| **3** | **First Message and Smart Greeting** | Pre-loaded AI greeting on empty conversations. Config-driven default message and suggestion chips. Referral-aware variant with referrer name interpolation. *(Builds on V0 Sprint 4 hero BrandHeader and single-conversation model.)* | +28 |
| **4** | **QR Code and Referral Tracking** | Referral schema, code generation, `?ref=` proxy handling, attribution on conversations, QR image endpoint, affiliate admin toggle, APPRENTICE role. *(Edge proxy at `src/proxy.ts` is the integration point for `?ref=` handling. See [Sprint 4 spec](sprint-4.md).)* | +44 |
| **TD-B** | **Technical Debt: Knuth Performance Audit** | Profile cold-start time, config loading, font payload, LCP on mobile, QR generation latency. Optimize critical path. Establish performance budget. | +6 (perf tests) |

### Phase C: Content and SEO

| Sprint | Name | Goal | Estimated tests |
| --- | --- | --- | --- |
| **5** | **Public Content Routes** | SEO metadata, OG tags, and JSON-LD on existing library routes. Verify public access (no auth required). *(Library index, domain pages, and chapter pages already exist at `src/app/library/` — this sprint enhances them with SEO infrastructure.)* | +10 |
| **6** | **SEO Infrastructure** | sitemap.xml generation, robots.txt, OG tags per page, JSON-LD structured data, canonical URLs. Plausible analytics script tag. | +8 |
| **7** | **Blog and Content Pipeline** | Blog index and post routes. Admin content drafting MCP tool. Draft → review → publish workflow. AI-assisted content creation. Long-running draft generation depends on the shared queue defined in [Deferred Job Orchestration](../deferred-job-orchestration/spec.md) rather than a blog-specific background path. | +10 |
| **TD-C** | **Technical Debt: Martin SOLID Audit** | Audit all new modules against SOLID principles. Focus on Single Responsibility (config vs. runtime), Open/Closed (tool registration), Dependency Inversion (config abstractions). Refactor violations. | +0 (refactor only) |

### Phase D: Business tools

| Sprint | Name | Goal | Estimated tests |
| --- | --- | --- | --- |
| **8** | **Booking MCP Tool** | `request_booking` tool, booking_requests table, chat-driven scheduling flow, admin notification via chat, booking status management. | +12 |
| **9** | **Stripe Placeholder and Payment Links** | `payment_links` table, admin tool to manage links, AI surfaces payment link when deal reaches "agreed" status. No Stripe SDK. | +6 |
| **10** | **Admin Pipeline Tools** | Convert the former dashboard-derived business loaders into admin MCP tools: `show_pipeline`, `show_leads`, `show_consultations`, `show_referrals`, `show_analytics`, `show_system_health`. All render via ICA rich content. | +12 |
| **TD-D** | **Technical Debt: GoF Pattern Compliance Audit** | Audit all tool registration, config loading, and data mapping against GoF patterns. Verify Strategy, Abstract Factory, Template Method, Observer, Facade, and Repository are correctly applied. Refactor deviations. | +0 (refactor only) |

### Phase E: Polish and deployment

| Sprint | Name | Goal | Estimated tests |
| --- | --- | --- | --- |
| **11** | **Apprentice Experience** | Apprentice-specific tools: `generate_qr`, `my_referrals`, `my_assignments`. Referral leaderboard data via admin tool. Profile page shows QR code. | +8 |
| **12** | **Phone-First Hardening** | Audit all chat interactions on mobile viewport. Touch target compliance. Safe area insets. Viewport-aware suggestion chips. Performance budget for 3G. | +6 |
| **13** | **Deployer Experience** | Docker base image publishing. Config-only deployment guide. `docker compose up` with mounted config volume. Verify fork-and-deploy workflow end-to-end. | +4 |
| **TD-E** | **Technical Debt: Full Architectural Review** | Combined Booch + Knuth + Martin + GoF sweep across the complete platform. Verify Clean Architecture layer boundaries. Integration test coverage audit. Performance regression check. Final refactor pass. | +8 (audit tests) |

---

## §9 Technical Debt Sprint Details

Each technical debt sprint follows a formal audit methodology. These are not optional cleanup — they are architectural verification gates.

### §9.1 TD-A: Booch Object Model Audit

**Scope:** All new and modified classes from Sprints 0–2.

**Audit checklist:**

1. **Abstraction quality.** Does each class represent a single, well-defined abstraction? Are class names accurate to their actual responsibility?
2. **Encapsulation.** Are internal details hidden? Are public interfaces minimal? Can a consumer use the class without understanding its internals?
3. **Modularity.** Can each module be understood, tested, and modified independently?
4. **Hierarchy.** Are inheritance relationships (if any) justified by genuine IS-A relationships? Are composition and delegation preferred where appropriate?
5. **Cohesion.** Does every method in a class relate to the class's single responsibility?

**Deliverable:** Audit report documenting findings and applied refactors.

### §9.2 TD-B: Knuth Performance Audit

**Scope:** Cold-start time, runtime performance, and payload optimization.

**Audit checklist:**

1. **Measure before optimizing.** Profile real numbers: config load time, first-message render time, LCP on mobile, font payload bytes, QR generation latency.
2. **Identify bottlenecks.** Are there O(n²) operations in config parsing? Is font loading blocking render? Is QR generation synchronous on the request path?
3. **Establish budgets.** Config load < 50ms. LCP < 2.5s on 4G. Font payload < 200KB. QR generation < 100ms.
4. **Optimize only measured bottlenecks.** Do not speculatively optimize. Apply Knuth's principle: "premature optimization is the root of all evil."
5. **Verify with Lighthouse.** Run Lighthouse CI against the production build. Compare against `lighthouse-prod.json` baseline.

**Deliverable:** Performance report with before/after measurements and applied optimizations.

### §9.3 TD-C: Martin SOLID Audit

**Scope:** All new modules from Sprints 3–7.

**Audit checklist:**

1. **Single Responsibility.** Does each module have exactly one reason to change? Is config loading separate from config validation separate from config access?
2. **Open/Closed.** Can new tools, content types, or service offerings be added without modifying existing code? Is the tool registry genuinely open for extension?
3. **Liskov Substitution.** Can any implementation of a config interface be swapped without breaking consumers?
4. **Interface Segregation.** Are tool interfaces minimal? Does the booking tool depend only on what it uses?
5. **Dependency Inversion.** Do core use cases depend on abstractions (interfaces) rather than concrete config loaders or database adapters?

**Deliverable:** SOLID audit report with violation catalog and applied refactors.

### §9.4 TD-D: GoF Pattern Compliance Audit

**Scope:** All tool registration, config loading, data mapping, and event handling from Sprints 8–10.

**Audit checklist:**

1. **Strategy pattern.** Is prompt selection genuinely polymorphic? Can a new prompt strategy be added without modifying the selection logic?
2. **Abstract Factory.** Does the tool factory produce consistent families of tools based on config? Are concrete factories hidden behind the abstract interface?
3. **Template Method.** Does the first-message renderer define a skeleton with overridable steps? Is the invariant part protected from modification?
4. **Observer.** Is referral attribution triggered by conversation events without tight coupling to the conversation creation code?
5. **Facade.** Does `getInstanceConfig()` genuinely simplify the subsystem? Does it hide file I/O, validation, caching, and defaults?
6. **Repository + Data Mapper.** Are new repositories consistent with existing patterns? Is the SQL isolated in mappers, not leaking into use cases?

**Deliverable:** GoF audit report with pattern verification and applied corrections.

### §9.5 TD-E: Full Architectural Review

**Scope:** Complete platform after all feature sprints.

**Audit checklist:**

1. **Clean Architecture boundaries.** Verify no imports flow inward (app → core is forbidden). Verify adapters depend on core interfaces, not concrete implementations.
2. **Layer purity.** No SQL in use cases. No UI logic in adapters. No business rules in route handlers.
3. **Integration test coverage.** Every MCP tool has at least one integration test exercising the full stack from tool invocation to database query.
4. **Performance regression.** Re-run Lighthouse CI. Compare against TD-B baseline. No regressions > 10%.
5. **Security review.** Re-verify all constraints from §6.2. Penetration test referral codes, QR endpoint, config injection, and public content routes.
6. **Deployer verification.** Fork the repo, change only config files, deploy via Docker, and verify the instance works end-to-end with different branding.

**Deliverable:** Final architectural review report. All sprints and TD sprints must pass before v1.0 release.

---

## §10 Future Considerations

These are explicitly **out of scope** for v1. They are recorded here to prevent scope creep during implementation.

| ID | Feature | Why deferred |
| --- | --- | --- |
| PLAT-F01 | **Multi-tenant single deployment** | v1 is separate instances. Multi-tenancy requires shared infrastructure, tenant isolation, and billing complexity that is premature. |
| PLAT-F02 | **Stripe webhook integration** | v1 uses payment link URLs only. Webhook processing requires event handling, idempotency, and error recovery that should come after real transactions exist. |
| PLAT-F03 | **Voice interface** | The chat-only architecture prepares for voice, but voice input/output (STT/TTS pipeline) is a separate workstream. |
| PLAT-F04 | **Cross-instance referral network** | Students at independent instances referring to each other requires a shared tracking service or API. Defer until independent instances exist. |
| PLAT-F05 | **Revenue sharing automation** | Apprentice payouts from referred deals require accounting integration. v1 tracks attribution manually. |
| PLAT-F06 | **Content version control** | Blog post versioning, diff history, rollback. v1 uses simple draft/published states. |
| PLAT-F07 | **Instance marketplace** | A directory of deployed Studio Ordo instances. Requires cross-instance discovery. |
| PLAT-F08 | **Postgres / Turso migration** | SQLite is sufficient for single-instance deployment. When concurrent user load exceeds SQLite WAL capacity, migrate to a compatible distributed database. |
| PLAT-F09 | **Custom MCP tool authoring** | Deployers writing their own MCP tools. v1 provides a fixed tool set configured via `tools.json`. Custom tools require a plugin architecture. |
| PLAT-F10 | **Mobile app / PWA** | Progressive Web App or native mobile wrapper. v1 is a responsive web application only. |
| PLAT-F11 | **White-label theming engine** | Advanced theming beyond font and color config. v1 provides basic identity customization. |
| PLAT-F12 | **Student certification / credentialing** | Formal verification that a student is qualified to deploy. v1 relies on program completion and admin discretion. |

---

## §11 Migration Strategy

### §11.1 Existing data preservation

All existing database tables and data are preserved. New tables are additive. Schema migrations are idempotent (existing `try/catch` ALTER pattern continues).

### §11.2 Existing test preservation

Dashboard tests are deleted with the dashboard. All other tests must remain green through every sprint. Test count is tracked per sprint.

### §11.3 Backward compatibility

The system must work with **no config files present**. When config files are missing, the system falls back to current hardcoded values. This ensures:

- Existing deployments continue working during migration
- Students can run `npm run dev` without creating config files first
- Config adoption is progressive, not mandatory

### §11.4 Sprint ordering

Sprints are numbered 0–13 with interleaved technical debt sprints (TD-A through TD-E). The ordering is strict:

```text
Sprint 0  → Sprint 1  → Sprint 2  → TD-A
Sprint 3  → Sprint 4  → TD-B
Sprint 5  → Sprint 6  → Sprint 7  → TD-C
Sprint 8  → Sprint 9  → Sprint 10 → TD-D
Sprint 11 → Sprint 12 → Sprint 13 → TD-E
```

Each phase is independently deployable. A deployer can ship after Phase B with a working front door and referral system even if content routes are not yet built.

---

## §12 Definition of Done

Platform v1 is complete when:

1. A visitor can scan a QR code, land on a personalized chat greeting, have a qualification conversation, and request a booking — entirely on their phone.
2. An admin can manage leads, deals, bookings, referrals, content, and analytics entirely through chat.
3. A student can fork the repo, edit 4 config files, drop in corpus content, deploy via Docker, and have a working AI business system for a client.
4. All public content is indexable by search engines with proper OG tags, sitemap, and robots.txt.
5. The system uses exactly 3 font families.
6. All architectural audits (Booch, Knuth, Martin, GoF) pass with no unresolved violations.
7. The full test suite passes with approximately 1400 tests (1194 post-V0 baseline + ~258 new − ~51 deleted).
8. The production build is clean with no TypeScript errors.
9. Lighthouse performance score meets the established budget from TD-B.
