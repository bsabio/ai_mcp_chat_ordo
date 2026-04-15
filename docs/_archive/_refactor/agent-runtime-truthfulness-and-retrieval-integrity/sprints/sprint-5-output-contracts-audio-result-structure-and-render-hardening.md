# Sprint 5 — Output Contracts, Audio Result Structure, And Render Hardening

> **Goal:** Move chips, inline actions, and audio from prompt convention to
> runtime-enforced contracts with explicit repair and structured result payloads.
> **Spec ref:** §3, §5.5, §7, §9
> **Prerequisite:** Sprint 4

---

## Task 5.1 — Add `__actions__` / `__suggestions__` repair

**What:** Normalize, repair, or safely drop malformed action and suggestion tags
at the presenter or stream boundary so the UI does not depend entirely on the
model being well-behaved.

### Verify Task 5.1

```bash
npm exec vitest run src/adapters/ChatPresenter.test.ts src/hooks/chat/useChatStreamRuntime.test.tsx
```

---

## Task 5.2 — Return structured audio results

**What:** Change `generate_audio` so the tool result carries enough metadata to
inspect, render, and debug the audio block.

Recommended fields:

1. `assetId`
2. `durationSeconds`
3. `provider`
4. generation status or failure reason
5. optional cache hit metadata

### Verify Task 5.2

```bash
npm exec vitest run src/components/AudioPlayer.test.tsx src/adapters/ChatPresenter.test.ts
```

---

## Task 5.3 — Render from result payloads, not just tool args

**What:** Chat rendering for audio and similar UI-producing tools should prefer
validated tool results over optimistic request args.

### Verify Task 5.3

```bash
npm exec vitest run src/adapters/ChatPresenter.test.ts src/frameworks/ui/RichContentRenderer.test.tsx
```

---

## Task 5.4 — Preserve existing rendering fixes with explicit regressions

**What:** Keep the already-landed rendering fixes permanently covered:

1. bold-nested corpus links
2. partial streamed links
3. shorthand corpus alias resolution
4. default-route markdown link parsing

### Verify Task 5.4

```bash
npm exec vitest run src/adapters/MarkdownParserService.test.ts src/hooks/chat/chatStreamTextBuffer.test.ts src/hooks/chat/useChatStreamRuntime.test.tsx 'src/app/library/section/[slug]/page.test.ts' 'src/app/corpus/section/[slug]/page.test.ts'
```
