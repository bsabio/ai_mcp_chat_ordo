# Spec 10: Stream Route Decomposition

**Priority:** High
**Risk if deferred:** 600+ line module with 8+ concerns resists testing, code review, and safe modification
**Files in scope:**
- `src/app/api/chat/stream/route.ts` (~600+ lines)

---

## Problem Statement

The chat stream route is the system's highest-volatility module. Despite extracting helpers (`createDeferredToolExecutor`, `parseRequestBody`, `ensureConversationState`, etc.), the main `POST` handler still orchestrates:

1. Session/auth validation
2. Request body parsing & validation
3. Conversation state creation/lookup
4. Attachment assignment
5. User message persistence
6. Routing analysis (with fallback)
7. Math-request short-circuiting
8. Tool executor factory creation with deferred-job wrapping
9. System prompt assembly with preferences injection
10. SSE stream orchestration and response formatting

This makes it difficult to test individual concerns in isolation, and any change risks side effects across unrelated responsibilities.

---

## Architectural Approach

### Design Decision: Pipeline Service Object

Extract the route into a **ChatStreamPipeline** — a plain class (not React, not middleware) that encapsulates the sequential steps as named methods. The route handler becomes a thin adapter between HTTP and the pipeline.

### Step 1: Define the pipeline interface

```typescript
// src/lib/chat/stream-pipeline.ts

export interface ChatStreamContext {
  user: SessionUser;
  request: ChatStreamRequest;       // Validated request body (from Spec 07)
  conversationId: string;
  messages: ConversationMessage[];
  systemPrompt: string;
  toolExecutor: ToolExecutor;
  routingHints?: RoutingAnalysis;
}

export class ChatStreamPipeline {
  constructor(
    private readonly deps: {
      sessionResolver: SessionResolver;
      conversationRepo: ConversationRepository;
      messageRepo: MessageRepository;
      attachmentService: AttachmentService;
      routingAnalyzer: RoutingAnalyzer;
      toolComposition: ToolCompositionResult;
      promptBuilder: SystemPromptBuilder;
      streamFactory: StreamFactory;
    }
  ) {}

  async resolveSession(req: NextRequest): Promise<SessionUser> { ... }
  
  async validateAndParse(req: NextRequest): Promise<ChatStreamRequest> { ... }
  
  async ensureConversation(
    userId: string, conversationId?: string
  ): Promise<string> { ... }
  
  async assignAttachments(
    conversationId: string, attachments: Attachment[]
  ): Promise<void> { ... }
  
  async persistUserMessage(
    conversationId: string, content: string
  ): Promise<void> { ... }
  
  async analyzeRouting(
    conversationId: string
  ): Promise<RoutingAnalysis | undefined> { ... }
  
  checkMathShortCircuit(
    messages: ConversationMessage[]
  ): Response | null { ... }
  
  async buildStreamContext(
    user: SessionUser, request: ChatStreamRequest
  ): Promise<ChatStreamContext> { ... }
  
  createStreamResponse(context: ChatStreamContext): Response { ... }
}
```

### Step 2: Implement each method by extracting from the current route

Each method maps directly to an existing block in the route:

| Method | Current Location | Lines (approx) |
|--------|-----------------|----------------|
| `resolveSession` | Top of POST handler | 10–15 |
| `validateAndParse` | Request body parsing block | 20–30 |
| `ensureConversation` | `ensureConversationState()` helper | 15–20 |
| `assignAttachments` | `assignAttachmentsToConversation()` | 15–20 |
| `persistUserMessage` | `persistUserMessage()` helper | 10–15 |
| `analyzeRouting` | Routing analysis try/catch | 10–15 |
| `checkMathShortCircuit` | `maybeHandleMathRequest()` | 15–20 |
| `buildStreamContext` | System prompt + history assembly | 30–40 |
| `createStreamResponse` | `createStreamResponse()` helper | 100 |

### Step 3: Reduce the route handler to pipeline orchestration

```typescript
// src/app/api/chat/stream/route.ts
import { ChatStreamPipeline } from "@/lib/chat/stream-pipeline";

const pipeline = new ChatStreamPipeline({ /* inject deps */ });

export async function POST(req: NextRequest): Promise<Response> {
  const user = await pipeline.resolveSession(req);
  const request = await pipeline.validateAndParse(req);
  
  const conversationId = await pipeline.ensureConversation(
    user.id, request.conversationId
  );
  
  await pipeline.assignAttachments(conversationId, request.attachments);
  await pipeline.persistUserMessage(conversationId, request.messages.at(-1)!.content);
  
  const routing = await pipeline.analyzeRouting(conversationId);
  
  const mathResponse = pipeline.checkMathShortCircuit(request.messages);
  if (mathResponse) return mathResponse;
  
  const context = await pipeline.buildStreamContext(user, request);
  return pipeline.createStreamResponse(context);
}
```

### Step 4: Keep the helpers as private methods or extracted utilities

Existing helper functions (`createDeferredToolExecutor`, `prepareStreamContext`) become private methods of the pipeline class, or stay as module-level functions if they are pure and stateless.

---

## Constraints — Do NOT Introduce

- **Do not** add a generic pipeline framework or middleware chain library. A plain class with named methods is sufficient.
- **Do not** change the HTTP request/response contract. The route returns the same SSE stream format.
- **Do not** move the route file. It stays at `src/app/api/chat/stream/route.ts`.
- **Do not** make the pipeline async-iterable or generator-based. Keep the explicit step calls.
- **Do not** decompose `createStreamResponse` further in this spec. It is complex but cohesive (SSE formatting is one concern).
- **Do not** change the conversation or message persistence logic. Only move it.

---

## Required Tests

### Unit Tests — `tests/stream-pipeline.test.ts`

Each pipeline method is independently testable because the class accepts injected dependencies:

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `resolveSession returns user from session resolver` | Mock session resolver, confirm user object returned. |
| 2 | `resolveSession throws on unauthenticated request` | Mock resolver to return null, expect auth error. |
| 3 | `validateAndParse rejects invalid request bodies` | Pass malformed body, expect 400-shaped error. |
| 4 | `ensureConversation creates new conversation when no ID provided` | Mock repo, confirm `create()` called, new ID returned. |
| 5 | `ensureConversation returns existing conversation when ID provided` | Mock repo, confirm `findById()` called, same ID returned. |
| 6 | `assignAttachments delegates to attachment service` | Mock service, confirm called with correct args. |
| 7 | `persistUserMessage saves to message repository` | Mock repo, confirm `save()` called with content. |
| 8 | `analyzeRouting returns undefined on failure (does not throw)` | Mock analyzer to throw, confirm method returns undefined (degradation path). |
| 9 | `checkMathShortCircuit returns Response for pure math input` | Pass message `"What is 2+2?"`, confirm Response returned. |
| 10 | `checkMathShortCircuit returns null for non-math input` | Pass message `"Tell me about history"`, confirm null. |
| 11 | `createStreamResponse returns Response with SSE content type` | Pass a valid context, confirm `Content-Type: text/event-stream`. |

### Structural Regression Test — `tests/stream-route-complexity.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `route.ts POST handler is less than 50 lines` | Read the file, count lines in the POST function, assert ≤ 50. |
| 2 | `ChatStreamPipeline has all expected methods` | Import the class, confirm all method names exist on the prototype. |

### Integration Test — `tests/stream-pipeline-integration.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `full pipeline produces valid SSE stream` | Construct pipeline with real (or realistic mock) deps, run all steps, confirm readable stream output. |
| 2 | `pipeline handles auth failure at first step` | Mock auth to fail, confirm early 401 response without touching downstream steps. |

---

## Acceptance Criteria

- [ ] `ChatStreamPipeline` class exists in `src/lib/chat/stream-pipeline.ts`.
- [ ] Route handler is reduced to pipeline orchestration (< 50 lines in POST function).
- [ ] Each pipeline step is independently testable via injected dependencies.
- [ ] No behavior changes in the HTTP contract (same request/response format).
- [ ] All existing chat stream tests pass.
- [ ] New tests above pass.
- [ ] No concern duplication between route handler and pipeline.
