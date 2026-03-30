# Spec 06: TTS Route Hardening

**Priority:** High
**Risk if deferred:** Blocking I/O stalls event loop; unbounded external fetch can hang indefinitely; oversized text causes silent failures
**Files in scope:**
- `src/app/api/tts/route.ts` (~150 lines)

---

## Problem Statement

The TTS route has three reliability issues:

1. **Blocking file read:** `fs.readFileSync(cached.diskPath)` in the request path blocks the Node.js event loop while reading cached audio from disk. Even small audio files (100KB–1MB) can stall other requests for 1–50ms.

2. **No fetch timeout:** The outbound `fetch()` to `https://api.openai.com/v1/audio/speech` has no timeout, no `AbortController`, and no retry strategy. If OpenAI is slow or unresponsive, the request hangs indefinitely.

3. **No text length validation:** The OpenAI TTS API has a ~4,096 character limit. The route does not validate `text.length` before making the API call, leading to silent truncation or API errors.

4. **Full buffer allocation:** `Buffer.from(await oaResponse.arrayBuffer())` reads the entire audio response into memory before writing to cache or responding. This is unbounded.

---

## Architectural Approach

### Step 1: Replace `readFileSync` with async file read

```typescript
// Before
const audio = fs.readFileSync(cached.diskPath);

// After
import { readFile } from "node:fs/promises";
const audio = await readFile(cached.diskPath);
```

This is the simplest fix. No streaming needed for cache reads — the files are small (typically <1MB).

### Step 2: Add timeout and abort controller to OpenAI fetch

```typescript
const TTS_FETCH_TIMEOUT_MS = 30_000; // 30 seconds

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), TTS_FETCH_TIMEOUT_MS);

try {
  const oaResponse = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, voice, input: text }),
    signal: controller.signal,
  });

  if (!oaResponse.ok) {
    throw new Error(`OpenAI TTS error: ${oaResponse.status} ${oaResponse.statusText}`);
  }
  // ... process response
} finally {
  clearTimeout(timeout);
}
```

### Step 3: Validate text length before API call

```typescript
const TTS_MAX_TEXT_LENGTH = 4096;

if (!text || typeof text !== "string") {
  return NextResponse.json({ error: "text is required" }, { status: 400 });
}

if (text.length > TTS_MAX_TEXT_LENGTH) {
  return NextResponse.json(
    { error: `Text exceeds maximum length of ${TTS_MAX_TEXT_LENGTH} characters` },
    { status: 400 },
  );
}
```

### Step 4: Cap response buffer size

Add a size guard when reading the OpenAI response:

```typescript
const TTS_MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB

const arrayBuffer = await oaResponse.arrayBuffer();
if (arrayBuffer.byteLength > TTS_MAX_RESPONSE_BYTES) {
  throw new Error(`TTS response exceeded ${TTS_MAX_RESPONSE_BYTES} byte limit`);
}
const audioBuffer = Buffer.from(arrayBuffer);
```

### Step 5: Standardize error responses

Return consistent error shapes for all failure modes:

```typescript
try {
  // ... TTS logic
} catch (err) {
  if (err instanceof Error && err.name === "AbortError") {
    return NextResponse.json(
      { error: "TTS request timed out" },
      { status: 504 },
    );
  }
  console.error("[tts] unexpected error", err);
  return NextResponse.json(
    { error: "TTS generation failed" },
    { status: 502 },
  );
}
```

---

## Constraints — Do NOT Introduce

- **Do not** add retry logic for the OpenAI call. A single attempt with a timeout is sufficient. Retries belong in a higher-level orchestration layer if needed.
- **Do not** stream the TTS response to the client. The current buffer-then-respond pattern is fine for audio files under 10MB.
- **Do not** change the cache storage mechanism. The existing disk cache pattern is correct; only the read path changes from sync to async.
- **Do not** add rate limiting in this spec — that is a separate concern handled at the middleware/infra level.
- **Do not** change the OpenAI model or voice selection logic.

---

## Required Tests

### Unit Tests — `tests/tts-route-hardening.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `rejects request with missing text field` | POST with `{}` body → 400 with `"text is required"`. |
| 2 | `rejects request with text exceeding 4096 characters` | POST with `text: "a".repeat(4097)` → 400 with max-length error. |
| 3 | `accepts request with text at exactly 4096 characters` | POST with `text: "a".repeat(4096)` → proceeds to TTS call (mock OpenAI). |
| 4 | `returns cached audio without calling OpenAI` | Seed cache, POST request, assert OpenAI fetch was NOT called, response is 200 with audio bytes. |
| 5 | `returns 504 when OpenAI times out` | Mock fetch to never resolve, set timeout to 100ms for test. Expect 504 timeout response. |
| 6 | `returns 502 when OpenAI returns non-200` | Mock fetch to return 500. Expect 502 error response. |
| 7 | `returns 502 when response buffer exceeds size limit` | Mock fetch to return a response larger than `TTS_MAX_RESPONSE_BYTES`. Expect error. |
| 8 | `does not use readFileSync anywhere in the module` | Read the source file, regex assert no `readFileSync` calls remain. Structural regression guard. |

### Performance Regression Test — `tests/tts-no-blocking-io.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `TTS route does not import readFileSync from fs` | Static analysis: import the module and confirm no `fs.readFileSync` in the dependency graph (or grep the source). |

---

## Acceptance Criteria

- [ ] `readFileSync` is replaced with `readFile` from `node:fs/promises`.
- [ ] OpenAI TTS fetch uses `AbortController` with a 30-second timeout.
- [ ] Text length is validated before the API call, with a clear 400 error.
- [ ] Response buffer size is capped at 10MB.
- [ ] Error responses use consistent JSON shape and appropriate HTTP status codes (400, 502, 504).
- [ ] All existing TTS tests pass.
- [ ] New tests above pass.
