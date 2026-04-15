# Conversation Lane Routing - Architecture Spec

> **Status:** Draft v1.0
> **Date:** 2026-03-18
> **Scope:** Add a conversation-level routing system that classifies each session as organization, individual, or uncertain so Studio Ordo can adapt prompts, recommendations, analytics, and follow-up paths.
> **Dependencies:** Conversation Memory (draft), Homepage Chat Shell (draft), Business specs for lane routing, conversation intelligence, and individual training offers
> **Affects:** `src/core/entities/conversation.ts`, `src/core/use-cases/ConversationInteractor.ts`, `src/core/use-cases/ConversationEventRecorder.ts`, `src/adapters/ConversationDataMapper.ts`, `src/adapters/ConversationEventDataMapper.ts`, `src/hooks/useGlobalChat.tsx`, `src/hooks/chat/useChatSend.ts`, `src/app/api/chat/stream/route.ts`, `src/lib/chat/conversation-root.ts`, `src/lib/chat/policy.ts`, and new routing-analysis components if required.
> **Motivation:** The business has two distinct lanes: organizational advisory and individual operator training. The runtime currently treats every conversation as a generic chat thread and has no durable routing state.
> **Requirement IDs:** `CLR-XXX`

---

## 1. Problem Statement

### 1.1 Business Requirement

The chat must distinguish between:

1. organizational buyers seeking advisory, workflow architecture, or team enablement `[CLR-010]`
2. individual users seeking training, mentorship, or apprenticeship direction `[CLR-011]`
3. uncertain cases that need one or two clarifying turns before routing `[CLR-012]`

### 1.2 Current Runtime Gap

The current runtime persists conversations and messages but carries no lane state.

Verified current structures:

```typescript
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  convertedFrom: string | null;
  messageCount: number;
  firstMessageAt: string | null;
  lastToolUsed: string | null;
  sessionSource: string;
  promptVersion: number | null;
}
```

```typescript
interface ChatContextType {
  messages: ChatMessage[];
  isSending: boolean;
  conversationId: string | null;
  isLoadingMessages: boolean;
  sendMessage: (
    messageText: string,
    files?: File[],
  ) => Promise<{ ok: boolean; error?: string }>;
  newConversation: () => void;
  archiveConversation: () => Promise<void>;
}
```

The streaming route currently accepts only:

```typescript
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const body = (await request.json()) as {
  messages?: ChatMessage[];
  conversationId?: string;
  attachments?: unknown[];
};
```

No lane classification, lane confidence, or routing recommendation is stored or exchanged. `[CLR-020]`

### 1.3 Existing Foundation

The repo already has a usable telemetry substrate:

```typescript
export class ConversationEventRecorder {
  async record(
    conversationId: string,
    eventType: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void>;
}
```

`conversation_events` already exists and can record lane-analysis or routing events without introducing a second ad hoc event path. `[CLR-021]`

### 1.4 Why This Matters

Without durable lane routing:

1. prompt behavior remains one-size-fits-all `[CLR-022]`
2. contact capture cannot ask the right follow-up fields `[CLR-023]`
3. conversation intelligence cannot report lane split or route quality `[CLR-024]`
4. the founder cannot tell whether traffic is commercial, educational, or apprenticeship-oriented `[CLR-025]`

---

## 2. Design Goals

1. **Durable routing state.** Lane classification must persist with the conversation, not live only in ephemeral prompt text. `[CLR-030]`
2. **Graceful uncertainty.** The system must support `uncertain` classification when evidence is weak. `[CLR-031]`
3. **Prompt adaptation.** The assistant should be able to ask better next questions based on lane state. `[CLR-032]`
4. **Founder visibility.** Lane state must be available to analytics and future dashboard views. `[CLR-033]`
5. **Minimal surface-area change.** Use the current conversation and event infrastructure where possible. `[CLR-034]`
6. **Traceable transitions.** If a conversation moves from one lane to another, the system should preserve that audit trail. `[CLR-035]`

---

## 3. Architecture Direction

### 3.1 Lane Model

The system should support exactly three top-level classifications:

1. `organization` `[CLR-040]`
2. `individual` `[CLR-041]`
3. `uncertain` `[CLR-042]`

Additional sub-classifications such as `organizational-training`, `apprenticeship-interest`, or `operator-intensive-fit` may exist as secondary signals, but the primary routing field should remain small and stable. `[CLR-043]`

### 3.2 Persistence Contract

A conversation needs a durable routing snapshot. The preferred implementation is a conversation-scoped state record rather than a transient client-only hint. `[CLR-044]`

Acceptable persistence options:

1. extend `conversations` with lane-routing columns `[CLR-045]`
2. add a one-to-one `conversation_profiles` or equivalent table keyed by `conversation_id` `[CLR-046]`

The persisted routing snapshot should include at minimum:

1. `lane` `[CLR-047]`
2. `confidence` `[CLR-048]`
3. `recommended_next_step` `[CLR-049]`
4. `last_analyzed_at` `[CLR-050]`
5. optional short summary of the detected need `[CLR-051]`

### 3.3 Event Contract

Every meaningful routing update should also be recorded through `ConversationEventRecorder.record(...)`. `[CLR-052]`

Suggested event types:

1. `lane_analyzed` `[CLR-053]`
2. `lane_changed` `[CLR-054]`
3. `lane_uncertain` `[CLR-055]`
4. `training_path_recommended` `[CLR-056]`

This keeps the event stream useful for future dashboard and analytics work. `[CLR-057]`

### 3.4 Runtime Flow Contract

The routing system should operate on the server after the latest user turn is persisted and before the assistant finalizes the next-step framing. `[CLR-058]`

The intended flow is:

1. `useChatSend()` sends the latest user turn through the existing stream path. `[CLR-059]`
2. `POST /api/chat/stream` persists the user message via `ConversationInteractor.appendMessage(...)`. `[CLR-060]`
3. the server runs lane analysis against the active conversation state `[CLR-061]`
4. the resulting routing snapshot is persisted and optionally appended to prompt context `[CLR-062]`
5. the assistant responds using the routing-aware context `[CLR-063]`

### 3.5 Prompt Context Contract

`buildSystemPrompt(role)` currently constructs role-aware prompt text, and the stream route already appends summary context via `buildSummaryContextBlock(summaryText)`. `[CLR-064]`

Lane-routing context should follow the same server-controlled pattern.

Required rules:

1. lane state must be injected by the server, not trusted from the client `[CLR-065]`
2. lane context should be short and operational, not verbose narrative `[CLR-066]`
3. uncertain state should instruct the model to ask clarifying questions instead of pretending certainty `[CLR-067]`

### 3.6 Client Exposure Contract

The client does not initially need full routing-state editing controls, but it does need enough exposure for future UX work. `[CLR-068]`

Minimal client-facing requirements:

1. future hero/chat UX can react to lane recommendation if needed `[CLR-069]`
2. future contact-capture UI can read the current lane and recommended next step `[CLR-070]`
3. analytics and dashboard views can query lane state without replaying the full transcript `[CLR-071]`

---

## 4. Testing Strategy

Add or update coverage for:

1. lane classification persistence on new and ongoing conversations `[CLR-080]`
2. uncertain-state behavior when evidence is weak or mixed `[CLR-081]`
3. event recording for lane analysis and lane changes `[CLR-082]`
4. prompt-context assembly that includes lane state without trusting the client `[CLR-083]`
5. future regression coverage that verifies organizational and individual sample conversations route differently `[CLR-084]`

Target verification will likely include conversation-interactor, stream-route, and analytics tests once implementation begins.

---

## 5. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Add durable lane-routing state and event types to the conversation model |
| 1 | Run lane analysis during the chat stream lifecycle and append routing-aware prompt context |
| 2 | Expose lane state to analytics and future UI consumers without transcript replay |
| 3 | Add founder review queues and admin inspection for recently changed or uncertain routing outcomes |

---

## 6. Future Considerations

1. richer sub-signals such as `apprenticeship_interest` or `team_training_need`
2. confidence-threshold tuning and manual founder override
3. lane-routing admin inspection tools
4. routing-aware homepage chips and chat recommendation cards
