# Progressive Contact Capture - Architecture Spec

> **Status:** Draft v1.0
> **Date:** 2026-03-18
> **Scope:** Implement lane-aware contact capture inside the chat experience so qualified organizational buyers and serious individual trainees can become structured follow-up records without breaking the consultative tone.
> **Dependencies:** Conversation Lane Routing (draft), Conversation Memory (draft), Homepage Chat Shell (draft), business specs for contact capture and pricing
> **Affects:** `src/core/entities/message-parts.ts`, `src/core/entities/MessageFactory.ts`, `src/frameworks/ui/MessageList.tsx`, `src/hooks/useGlobalChat.tsx`, `src/hooks/chat/useChatSend.ts`, `src/app/api/chat/stream/route.ts`, `src/core/use-cases/ConversationInteractor.ts`, `src/core/use-cases/ConversationEventRecorder.ts`, `src/adapters/ConversationEventDataMapper.ts`, `src/lib/db/schema.ts`, and new lead-capture persistence and submission routes if required.
> **Motivation:** The site is chat-first. Strong conversations currently create insight but do not create structured follow-up records for the founder. Contact capture needs to happen in the thread, after value is demonstrated, and with different fields for organizations and individuals.
> **Requirement IDs:** `PCC-XXX`

---

## 1. Problem Statement

### 1.1 Business Requirement

Contact capture must be:

1. progressive rather than form-first `[PCC-010]`
2. lane-aware rather than generic `[PCC-011]`
3. contextual rather than forcing the user to restate their problem `[PCC-012]`
4. structured enough to support future deals, training follow-up, and dashboard prioritization `[PCC-013]`

### 1.2 Current Runtime Gap

The current message and chat stack support only these message-part types:

```typescript
export type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: unknown }
  | {
      type: "attachment";
      assetId: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
    }
  | { type: "summary"; text: string; coversUpToMessageId: string };
```

There is no structured in-chat contact-capture part or submission model. `[PCC-020]`

The client send path is similarly generic:

```typescript
sendMessage(
  messageText: string,
  files?: File[],
): Promise<{ ok: boolean; error?: string }>;
```

The stream route currently persists user and assistant messages, attachments, and conversation events, but it does not create lead records or prompt the client to render a structured capture step. `[PCC-021]`

### 1.3 Existing Foundation

The repo already has three useful primitives:

1. persisted conversations and messages via `ConversationInteractor` `[PCC-022]`
2. routing-capable conversation state once lane-routing work exists `[PCC-023]`
3. `ConversationEventRecorder.record(conversationId, eventType, metadata)` for funnel and capture telemetry `[PCC-024]`

### 1.4 Why This Matters

Without progressive contact capture:

1. high-intent conversations remain anonymous and non-actionable `[PCC-025]`
2. the founder must infer commercial importance manually from transcripts `[PCC-026]`
3. future deals, training records, and proposals have no clean originating lead object `[PCC-027]`
4. the chat-first UX behaves like a demo instead of a working funnel `[PCC-028]`

---

## 2. Design Goals

1. **In-thread capture.** Contact capture must happen inside the chat experience, not as a jarring redirect to a generic page form. `[PCC-030]`
2. **Lane-aware fields.** Organizations and individuals should be asked for different supporting details. `[PCC-031]`
3. **Minimal friction.** Capture only what is needed for a useful next step. `[PCC-032]`
4. **Structured persistence.** Captured information must become a first-class record, not just text embedded in a transcript. `[PCC-033]`
5. **Context retention.** The founder should receive the conversation summary and routing context alongside the capture record. `[PCC-034]`
6. **Telemetry.** Triggered, completed, declined, and missed capture moments should be recorded. `[PCC-035]`

---

## 3. Architecture Direction

### 3.1 Lead Record Model

The system needs a structured persistence model for captured contact records. `[PCC-040]`

Required minimum fields:

1. `conversation_id` `[PCC-041]`
2. `lane` `[PCC-042]`
3. `name` `[PCC-043]`
4. `email` `[PCC-044]`
5. `organization` when applicable `[PCC-045]`
6. `role_or_title` `[PCC-046]`
7. optional training goal or skill-level field for individual leads `[PCC-047]`
8. system-generated problem summary `[PCC-048]`
9. recommended next action `[PCC-049]`
10. capture status and timestamps `[PCC-050]`

This may be stored in a dedicated `lead_records` or similarly named table. The data should not be flattened into the existing `conversations` table because capture status and contact details have a different lifecycle than thread metadata. `[PCC-051]`

### 3.2 In-Chat UI Contract

The runtime needs a structured way to ask for contact information inside the thread. `[PCC-052]`

Preferred approach:

1. extend `MessagePart` with a capture-oriented part such as `contact_capture_prompt` `[PCC-053]`
2. render that part in `MessageList` as a compact in-thread CTA or form card `[PCC-054]`
3. submit the capture through a dedicated API route or command path without pretending it is a normal free-text user message `[PCC-055]`

This is preferable to burying the entire capture ask in plain markdown because the UI needs stateful behavior: prompt displayed, submission pending, submission complete, or dismissed. `[PCC-056]`

### 3.3 Trigger Contract

The capture system should trigger only when:

1. lane routing is `organization` or high-confidence `individual` `[PCC-057]`
2. the conversation has produced enough signal to justify follow-up `[PCC-058]`
3. the recommended next step requires founder contact or training follow-up `[PCC-059]`

The trigger decision should happen on the server and be recorded as an event. `[PCC-060]`

### 3.4 Submission Contract

A submitted capture should:

1. create or update the lead record `[PCC-061]`
2. record a `contact_capture_completed` event `[PCC-062]`
3. preserve the current routing state and conversation summary `[PCC-063]`
4. acknowledge success inside the thread without degrading the ongoing chat experience `[PCC-064]`

A declined or dismissed capture should also be evented so the founder can distinguish low intent from missed UX opportunities. `[PCC-065]`

### 3.5 API Contract

The current stream route should remain focused on conversational exchange. `[PCC-066]`

Progressive contact capture should use a dedicated server pathway such as:

1. a new chat-adjacent API route for capture submission `[PCC-067]`
2. a dedicated repository/use-case pair for lead record creation and update `[PCC-068]`
3. event recording through the existing `ConversationEventRecorder` `[PCC-069]`

This separation keeps the chat stream simpler and allows capture submissions to be retried, validated, and tested independently. `[PCC-070]`

### 3.6 Lane-Aware Field Rules

If the active lane is `organization`, the capture UI should prefer:

1. name `[PCC-071]`
2. email `[PCC-072]`
3. company or organization `[PCC-073]`
4. title or role `[PCC-074]`
5. optional team context `[PCC-075]`

If the active lane is `individual`, the capture UI should prefer:

1. name `[PCC-076]`
2. email `[PCC-077]`
3. current role or background `[PCC-078]`
4. optional training goal or apprenticeship interest `[PCC-079]`

The system must not force irrelevant organizational fields onto individual users. `[PCC-080]`

### 3.7 Founder Data Contract

The founder should be able to review capture outcomes without replaying the whole conversation. `[PCC-081]`

That means each lead record should carry:

1. lane classification `[PCC-082]`
2. short conversation summary `[PCC-083]`
3. intent or follow-up priority metadata `[PCC-084]`
4. source conversation reference `[PCC-085]`

These fields are the bridge from contact capture to future deals, training packages, and dashboard priority views. `[PCC-086]`

---

## 4. Security And Validation

1. submitted contact fields must be validated server-side `[PCC-090]`
2. email must not be trusted without format validation `[PCC-091]`
3. capture submission must be tied to the correct `conversation_id` and current user ownership model `[PCC-092]`
4. internal founder-only fields such as score or routing notes must not be editable from the client `[PCC-093]`
5. a dismissed capture prompt must not silently create a lead record `[PCC-094]`

---

## 5. Testing Strategy

Add or update coverage for:

1. trigger logic that distinguishes high-intent from low-intent conversations `[PCC-100]`
2. lane-aware field selection for organization vs individual capture `[PCC-101]`
3. structured message rendering for capture prompts `[PCC-102]`
4. successful submission persistence and event recording `[PCC-103]`
5. declined or dismissed capture event recording `[PCC-104]`
6. validation failures for malformed or incomplete submissions `[PCC-105]`

---

## 6. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Introduce lead-record persistence and capture-event telemetry |
| 1 | Add structured in-chat capture prompts and lane-aware field sets |
| 2 | Connect capture completion to future deal/training workflows and founder review surfaces |

---

## 7. Future Considerations

1. calendar booking after successful capture
2. CRM synchronization
3. multi-step qualification for larger organizational engagements
4. training application flows and apprenticeship screening submissions
