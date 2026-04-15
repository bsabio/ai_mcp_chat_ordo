# Tool Spec 06 — Media Generation: Charts & Audio

> **Status:** Draft
> **Priority:** Medium — transforms stub tools into production-quality features
> **Scope:** Server-side Mermaid validation and templates, server-side TTS,
>   audio chapter narration
> **Dependencies:** Spec 03 (chapter pagination for narration), Spec 01
>   (search for content-based chart generation)
> **Affects:** `generate_chart`, `generate_audio` tools

---

## 1. Problem Statement

### 1.1 Charts

`GenerateChartCommand` **ignores its input entirely.** The `code` argument
(Mermaid syntax) flows through the SSE `tool_call` event to the frontend, which
renders it. The server does zero validation, zero processing.

Problems:
- Invalid Mermaid syntax renders as an error on the client with no feedback
  to the LLM — the LLM thinks it succeeded.
- No chart templates — the LLM must generate Mermaid syntax from scratch every
  time, which is error-prone.
- No data-driven chart generation — the LLM can't say "make a pie chart from
  this data" because it must manually format Mermaid.
- When the Mermaid code is broken, neither the LLM nor the user gets a useful
  error message.

### 1.2 Audio

`GenerateAudioCommand` **ignores its input entirely.** The `text` and `title`
arguments flow to the frontend, which presumably uses browser `SpeechSynthesis`.

Problems:
- Browser TTS quality is poor — robotic, no prosody, inconsistent across
  browsers.
- No server-side audio generation — can't generate high-quality narration.
- No text length validation — could attempt to TTS an entire chapter.
- No voice selection or speed control.
- "Read me this chapter" doesn't work — the LLM would need to fetch chapter
  content, then pass all of it through generate_audio as a single call.

---

## 2. Chart Intelligence — `generate_chart`

### 2.1 Server-Side Mermaid Validation

Validate Mermaid syntax before returning success. Use `mermaid` package's
parser (not the full renderer — parsing is sufficient for validation):

```typescript
import mermaid from "mermaid";

async function validateMermaid(code: string): Promise<{ valid: boolean; error?: string }> {
  try {
    await mermaid.parse(code);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}
```

### 2.2 Error Feedback Loop

When validation fails, return the error to the LLM so it can fix the syntax:

```typescript
interface ChartResponse {
  success: boolean;
  code: string;                    // the Mermaid code (echoed back)
  chartType: string;               // "flowchart", "sequence", "pie", etc.
  error?: string;                  // Mermaid parse error, if any
  suggestion?: string;             // "Did you mean 'graph TD' instead of 'graph XY'?"
}
```

This creates a **self-correcting loop:** the LLM generates code → server
validates → if invalid, the LLM gets the error and retries → next attempt
is informed by the specific error message.

### 2.3 Data-Driven Chart Mode

Accept structured data instead of raw Mermaid code. The server generates the
Mermaid syntax:

```typescript
{
  name: "generate_chart",
  input_schema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "Raw Mermaid code. Use this for custom diagrams."
      },
      type: {
        type: "string",
        enum: ["pie", "bar", "flowchart", "sequence", "mindmap", "timeline", "gantt"],
        description: "Chart type for data-driven generation"
      },
      data: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            value: { type: "number" },
          },
        },
        description: "Data points for pie/bar charts"
      },
      title: { type: "string", description: "Chart title" },
    },
  },
}
```

**Resolution:** If `code` is provided, validate and use it. If `type` + `data`
are provided, generate Mermaid code from the data:

```typescript
// Input: { type: "pie", title: "Design Principles", data: [{label: "Usability", value: 40}, {label: "Aesthetics", value: 30}, {label: "Accessibility", value: 30}] }
// Generated:
`pie title Design Principles
    "Usability" : 40
    "Aesthetics" : 30
    "Accessibility" : 30`
```

### 2.4 Chart Templates

Pre-built templates for common educational diagrams:

```typescript
const TEMPLATES: Record<string, string> = {
  "design-thinking": `graph LR
    A[Empathize] --> B[Define]
    B --> C[Ideate]
    C --> D[Prototype]
    D --> E[Test]
    E -->|iterate| A`,

  "sdlc-waterfall": `graph TD
    A[Requirements] --> B[Design]
    B --> C[Implementation]
    C --> D[Testing]
    D --> E[Deployment]
    E --> F[Maintenance]`,

  "clean-architecture": `graph TD
    A[Entities] --> B[Use Cases]
    B --> C[Interface Adapters]
    C --> D[Frameworks & Drivers]`,

  // ... ~20 domain-relevant templates
};
```

The LLM can say: "Let me show you the design thinking process" → calls
`generate_chart({template: "design-thinking"})` → instant, validated diagram.

---

## 3. Audio Intelligence — `generate_audio`

### 3.1 Server-Side TTS

Generate actual audio files using a TTS API. Options (in priority order):

| Option | Cost | Quality | Latency |
| --- | --- | --- | --- |
| **edge-tts** (Microsoft Edge TTS) | Free | Good | ~2-5s |
| **OpenAI TTS** | $15/1M chars | Excellent | ~3-8s |
| **ElevenLabs** | Free tier: 10K chars/mo | Excellent | ~5-10s |
| **Browser SpeechSynthesis** (fallback) | Free | Poor | Instant |

**Recommended:** `edge-tts` as primary (MIT license, excellent quality, zero
cost), OpenAI TTS as premium option for authenticated users.

### 3.2 Audio Pipeline

```text
1. Receive text + title + options
2. Validate text length (≤5000 characters)
3. Generate audio via TTS API → WAV/MP3 buffer
4. Store in temp directory: .data/audio/{hash}.mp3
5. Return URL: /api/audio/{hash}
6. Client renders <audio> player with the URL
7. Cleanup: delete audio files older than 1 hour
```

### 3.3 Enhanced Schema

```typescript
{
  name: "generate_audio",
  input_schema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Text to convert to speech (max 5000 characters)"
      },
      title: {
        type: "string",
        description: "Title for the audio player"
      },
      voice: {
        type: "string",
        enum: ["alloy", "echo", "nova", "shimmer", "onyx", "fable"],
        description: "Voice selection (default: nova)"
      },
      speed: {
        type: "number",
        description: "Playback speed multiplier (0.5 to 2.0, default 1.0)"
      },
      // New: narrate a chapter directly
      book_slug: {
        type: "string",
        description: "Book slug — narrate a chapter section instead of raw text"
      },
      chapter_slug: {
        type: "string",
        description: "Chapter slug — used with book_slug for chapter narration"
      },
      section: {
        type: "number",
        description: "Section index to narrate (default: 0, the first section)"
      },
    },
    required: ["title"],  // text OR book_slug+chapter_slug required
  },
}
```

### 3.4 Chapter Narration

When `book_slug` + `chapter_slug` are provided instead of raw `text`, the
tool fetches the chapter content internally and narrates it:

```text
1. Fetch chapter via GetChapterInteractor
2. Extract the requested section (or first section)
3. Clean markdown: strip headings, links, code blocks (not natural in speech)
4. Generate audio from cleaned text
5. Return audio URL + section metadata
```

### 3.5 Response Format

```typescript
interface AudioResponse {
  success: boolean;
  title: string;
  audioUrl: string;               // /api/audio/{hash}
  duration: number;               // estimated seconds
  charCount: number;
  voice: string;
  speed: number;
  source?: {                      // if chapter narration
    bookTitle: string;
    chapterTitle: string;
    section: string;
    hasNextSection: boolean;
  };
  error?: string;                 // if text too long, TTS failed, etc.
}
```

### 3.6 Audio API Endpoint

New endpoint to serve generated audio files:

```typescript
// src/app/api/audio/[hash]/route.ts
export async function GET(request: Request, { params }: { params: { hash: string } }) {
  const audioPath = path.join(AUDIO_DIR, `${params.hash}.mp3`);
  // Validate hash format (alphanumeric only — prevent path traversal)
  // Stream the file with Content-Type: audio/mpeg
  // Return 404 if not found or expired
}
```

---

## 4. File Plan

### New Files

| File | Layer | Purpose |
| --- | --- | --- |
| `src/core/entities/mermaid-templates.ts` | Core | Chart template registry |
| `src/core/entities/mermaid-generator.ts` | Core | Data → Mermaid code generation |
| `src/adapters/MermaidValidator.ts` | Adapter | Wraps mermaid.parse() for validation |
| `src/adapters/TextToSpeechService.ts` | Adapter | TTS API wrapper (edge-tts / OpenAI) |
| `src/adapters/AudioFileStore.ts` | Adapter | Manages .data/audio/ temp directory |
| `src/app/api/audio/[hash]/route.ts` | Framework | Serves generated audio files |
| `src/core/content/MarkdownToSpeech.ts` | Core | Strips markdown for natural speech |

### Modified Files

| File | Change |
| --- | --- |
| `src/core/use-cases/tools/UiTools.ts` | `GenerateChartCommand` validates + generates; `GenerateAudioCommand` generates real audio |
| `src/core/use-cases/tools/generate-chart.tool.ts` | Schema with `type`, `data`, `template` properties |
| `src/core/use-cases/tools/generate-audio.tool.ts` | Schema with `voice`, `speed`, `book_slug`, `chapter_slug` |
| `src/lib/chat/tool-composition-root.ts` | Wire TTS service, Mermaid validator, audio store |

### New Dependencies

| Package | Size | License | Purpose |
| --- | --- | --- | --- |
| `mermaid` | ~2MB | MIT | Server-side Mermaid parsing/validation |
| `edge-tts` | ~50KB | MIT | Free Microsoft Edge TTS API |

---

## 5. Requirement IDs

### Charts

| ID | Requirement |
| --- | --- |
| MEDIA-CHART-1 | Valid Mermaid code returns `success: true` with chartType |
| MEDIA-CHART-2 | Invalid Mermaid code returns `success: false` with parse error |
| MEDIA-CHART-3 | Data-driven mode: `{type: "pie", data: [...]}` generates valid Mermaid |
| MEDIA-CHART-4 | Template mode: `{template: "design-thinking"}` returns pre-validated code |
| MEDIA-CHART-5 | All generated Mermaid code passes validation before returning |
| MEDIA-CHART-6 | Error messages are specific enough for the LLM to fix the issue |

### Audio

| ID | Requirement |
| --- | --- |
| MEDIA-AUDIO-1 | Text ≤5000 chars → generates playable audio file |
| MEDIA-AUDIO-2 | Audio URL is accessible via `/api/audio/{hash}` |
| MEDIA-AUDIO-3 | Chapter narration mode fetches content and generates audio |
| MEDIA-AUDIO-4 | Markdown is cleaned before TTS (headings, links, code removed) |
| MEDIA-AUDIO-5 | Voice selection changes the TTS voice |
| MEDIA-AUDIO-6 | Speed parameter adjusts playback rate (0.5–2.0) |
| MEDIA-AUDIO-7 | Text >5000 chars returns clear error with character count |
| MEDIA-AUDIO-8 | Audio files are cleaned up after 1 hour |
| MEDIA-AUDIO-9 | Hash in URL is validated (alphanumeric only, no path traversal) |

---

## 6. Test Scenarios

```text
TEST-MEDIA-01: generate_chart({code: "graph TD; A-->B"}) → success, chartType="flowchart"
TEST-MEDIA-02: generate_chart({code: "invalid mermaid"}) → error with parse message
TEST-MEDIA-03: generate_chart({type: "pie", data: [{label: "A", value: 60}, {label: "B", value: 40}]}) → valid Mermaid
TEST-MEDIA-04: generate_chart({template: "design-thinking"}) → returns validated template code
TEST-MEDIA-05: Self-correction: invalid syntax → error → LLM retries with fix → success

TEST-MEDIA-06: generate_audio({text: "Hello world", title: "Test"}) → audioUrl returned
TEST-MEDIA-07: /api/audio/{hash} → serves audio/mpeg content
TEST-MEDIA-08: generate_audio({text: "x".repeat(6000)}) → error: text too long
TEST-MEDIA-09: generate_audio({book_slug: "ux-design", chapter_slug: "intro", title: "Narration"}) → narrates chapter
TEST-MEDIA-10: Audio hash validation: /api/audio/../../etc/passwd → 400 Bad Request
TEST-MEDIA-11: Audio cleanup: files older than 1 hour are deleted
TEST-MEDIA-12: Markdown-to-speech strips ## headings, [links](url), ```code blocks```
```

---

## 7. Security Considerations

### Charts
- Mermaid code is parsed, not executed. No XSS risk in server-side parsing.
- Client-side rendering uses Mermaid's built-in sanitization.

### Audio
- **Path traversal:** Hash parameter must be validated as alphanumeric only.
  Reject any hash containing `/`, `..`, `\`, or non-alphanumeric characters.
- **Disk usage:** Audio files stored in `.data/audio/`. Enforce max file count
  (e.g., 100 files) and max total size (e.g., 500MB). Reject generation if
  limits exceeded.
- **Rate limiting:** TTS is the most expensive tool operation. Per-user rate
  limit: 10 generations per hour for AUTHENTICATED, 30 for STAFF/ADMIN.
- **Content filtering:** The TTS service may reject certain content. Pass
  errors through clearly.

---

## 8. Open Questions

1. **Should `edge-tts` be the only TTS option, or should we support multiple
   backends?** A strategy pattern (`TTSProvider` interface) future-proofs for
   OpenAI TTS or ElevenLabs without changing the tool interface.
2. **Audio format:** MP3 is universal. Should we also support OGG/WAV for
   quality? MP3 is sufficient for speech.
3. **Streaming audio:** For long text, should we stream audio as it's generated?
   For ≤5000 chars, batch generation is fast enough (~3-5 seconds).
4. **Should ANONYMOUS users get audio?** Currently `generate_audio` is
   AUTH+ only. The spec preserves this restriction.
5. **Chart SVG export:** Should the server render SVG (using `@mermaid-js/mermaid-cli`)
   in addition to validation? This would provide an image fallback for
   environments where the Mermaid JS renderer doesn't work.
