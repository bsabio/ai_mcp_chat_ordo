# Sprint 1 - Command Dependency Removal

> **Goal:** Remove the active composer runtime’s dependency on the shared mutable command singleton.
> **Spec ref:** `CRH-021`, `CRH-030`, `CRH-031`, `CRH-032`

## Tasks

1. Rewrite `src/hooks/useCommandRegistry.ts` so it builds its command list locally with existing `Command`, `NavigationCommand`, and `ThemeCommand` types.
2. Replace ambient command lookup/execution with local `findCommands()` and `executeCommand()` callbacks returned from the hook.
3. Remove the now-redundant ambient chat command adapter from the active runtime path.

## Completion Checklist

- [x] Composer command path no longer uses the singleton registry
- [x] `useCommandRegistry()` returns local lookup/execute callbacks
- [x] Ambient chat command adapter removed

## QA Deviations

None.

## Verification

- `npm exec vitest run src/hooks/chat/useChatComposerController.test.tsx src/frameworks/ui/ChatContainer.test.tsx tests/homepage-shell-layout.test.tsx tests/homepage-shell-ownership.test.tsx tests/browser-motion.test.tsx`
