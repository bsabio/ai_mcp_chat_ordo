# Sprint 1 - Header and Theme Command Decoupling

> **Goal:** Split the floating header from the embedded header contract and remove FAB-local theme/grid controls so theme and accessibility changes continue only through the existing assistant command path.
> **Spec Sections:** `FAB-012`, `FAB-031`, `FAB-052`, `FAB-068` through `FAB-096`, `FAB-121`, `FAB-132`, `FAB-133`
> **Status:** Implemented on 2026-03-21
> **Depends on Sprint 0:** Shell ownership and route policy (completed and QA'd)

## Sprint 0 Outcomes That Sprint 1 Depends On

Sprint 0 delivered the following verified assets that Sprint 1 builds on:

1. `GlobalChat` owns only route presence policy: suppresses FAB on `/`, renders `FloatingChatShell` elsewhere. `[FAB-084]`
2. `FloatingChatShell` owns launcher/open/full-screen lifecycle and `OPEN_GLOBAL_CHAT_EVENT` subscription. `[FAB-085]`
3. `FloatingChatLauncher` isolates the closed-state FAB trigger markup and accessibility hook. `[FAB-086]`
4. `FloatingChatFrame` owns floating-shell geometry, size attributes, and composes the floating header. `[FAB-087]`
5. `ChatContentSurface` provides the shared viewport and composer subtree reused by embedded and floating surfaces.
6. `ChatContainer` is now embedded-only with zero props — the `isFloating` prop was removed during Sprint 0 QA. It internally hard-codes `isEmbedded: true` and uses the shared `useViewTransitionReady()` hook.
7. `useViewTransitionReady()` was extracted during Sprint 0 QA as a shared hook at `src/hooks/useViewTransitionReady.ts`, eliminating the duplicated rAF + feature-detect pattern from both `ChatContainer` and `FloatingChatShell`. `FloatingChatFrame` receives `canUseViewTransitions` as a prop from `FloatingChatShell`.
8. Both `ChatContainer` and `FloatingChatFrame` share `viewTransitionName = "chat-container"`, which is safe only because `GlobalChat` enforces mutual exclusion (their coexistence is now documented via code comments).
9. Sprint 0 tests now include fullscreen toggle-back, shared-state survival after minimize, ARIA dialog landmark check on duplicate events, and stable accessibility hooks across repeated open/minimize cycles.

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/frameworks/ui/ChatHeader.tsx` | `ChatHeader` is now an embedded-only header surface with search, density, and grid controls isolated from the floating FAB path. Props: `title`, `subtitle`, `searchQuery`, `onSearchChange`, `density`, `onDensityChange`, `gridEnabled`, `onGridToggle`. |
| `src/frameworks/ui/FloatingChatHeader.tsx` | `FloatingChatHeader` now owns only floating-shell concerns: conversation actions slot, full-screen toggle, minimize action. Props: `onMinimize`, `onFullScreenToggle`, `isFullScreen`, `conversationActions?`. No title, subtitle, density, grid, or search controls. |
| `src/components/FloatingChatShell.tsx` | `FloatingChatShell` does not call `useTheme()`. It uses `useViewTransitionReady()` for transition detection and delegates all chat state to `useChatSurfaceState({ isEmbedded: false })`. |
| `src/frameworks/ui/FloatingChatFrame.tsx` | `FloatingChatFrame` composes `FloatingChatHeader` directly and forwards only `onMinimize`, `onFullScreenToggle`, `isFullScreen`, and `conversationActions`. No search, density, or grid props are forwarded. |
| `src/frameworks/ui/ChatContainer.tsx` | `ChatContainer` is embedded-only with zero props. Hard-codes `isEmbedded: true` via `useChatSurfaceState`. Uses `useViewTransitionReady()`. The `isFloating` prop was removed during Sprint 0 QA. |
| `src/hooks/useViewTransitionReady.ts` | Shared hook extracted during Sprint 0 QA. Returns a boolean: waits one rAF for client readiness, then resolves `supportsViewTransitions() && !supportsReducedMotion()`. Used by `ChatContainer` and `FloatingChatShell`. |
| `src/components/ThemeProvider.tsx` | `ThemeProvider` owns `theme`, `isDark`, `accessibility` (includes `density: "compact" \| "normal" \| "relaxed"`), `gridEnabled`, and their setters. `useTheme()` returns the full context. |
| `src/hooks/useUICommands.ts` | Handles assistant-issued `set_theme` (calls `setTheme`), `adjust_ui` (calls `applyUIAdjustment` for density, fontSize, lineHeight, letterSpacing, colorBlindMode, dark, theme, preset), and `navigate`. Baseline/dedup logic prevents replaying historical commands. |
| `src/hooks/useCommandRegistry.ts` | Provides `executeCommand` and `findCommands`. Delegates theme to `createShellCommands({ navigate, setTheme })` which registers 4 theme commands (bauhaus, swiss, skeuomorphic, fluid) via `ThemeCommand`. |
| `src/lib/shell/shell-commands.ts` | Defines `SHELL_THEME_DEFINITIONS` and creates `ThemeCommand` instances for the slash-command path. |
| `src/core/commands/ThemeCommands.ts` | `ThemeCommand` encapsulates command-driven theme switching via `execute()`. |
| `src/components/AccountMenu.tsx` | Existing account/settings UI already exposes manual dark-mode, grid, and accessibility controls outside the FAB. |
| `src/components/FloatingChatShell.test.tsx` | Floating-shell regressions assert the floating header does not render density, grid, or embedded search controls. Now includes fullscreen toggle-back, shared state survival, ARIA dialog landmark, and a11y hook cycle tests from Sprint 0 QA. |
| `src/hooks/useUICommands.test.tsx` | Direct regression coverage proves `set_theme` and `adjust_ui` still update `ThemeProvider` state after FAB-local controls were removed. Also covers baseline dedup and history replay prevention. |
| `tests/shell-visual-system.test.tsx` | Visual-system coverage exercises `ChatHeader` and `FloatingChatHeader` separately. Test #6 asserts floating header renders only fullscreen + minimize, does not render density, grid, search, title, or subtitle. Test #3 asserts embedded header renders density buttons and heading roles. |
| `tests/shell-command-parity.test.ts` | Command-registry integration coverage: verifies command ID alignment across palette and slash surfaces, stable theme IDs, `useCommandRegistry` mention alignment, `executeCommand` → `setTheme` execution chain, and rejection of unknown command IDs. |

## Tasks

1. Replace the dual-purpose `ChatHeader` contract with a dedicated floating header component that accepts only floating-shell concerns: conversation actions, full-screen toggle, and minimize action.
2. Preserve the embedded-only search/density/grid affordances behind the embedded header component (`ChatHeader`) and confirm it no longer shares any code path with the floating shell.
3. Remove search, density, and grid props from the floating shell path so `FloatingChatShell` and `FloatingChatFrame` stop reading `useTheme()` state solely for floating-header controls.
4. Keep theme and accessibility adjustments flowing only through the existing `useUICommands()` path and the shell command registry in `useCommandRegistry()`.
5. Confirm no FAB-related test doubles use the invalid density literal `"comfortable"`. All mocks must use `"compact" | "normal" | "relaxed"`.
6. Add focused structural and browser-style regressions proving the floating header no longer renders density/grid controls while command-driven theme updates still affect UI state.

## Test Matrix

### Positive Tests

1. Verify the floating shell renders `FloatingChatHeader` with only conversation actions, full-screen toggle, and minimize control — no title, subtitle, density, grid, or search.
   - **Covered by:** `tests/shell-visual-system.test.tsx` test #6, `src/components/FloatingChatShell.test.tsx` test #1.
2. Verify the embedded `ChatHeader`, when rendered directly, still owns search, density, and grid concerns with `shell-panel-heading` and `shell-meta-text` roles applied to its branding.
   - **Covered by:** `tests/shell-visual-system.test.tsx` test #3.
3. Verify assistant-issued `set_theme` commands still update `ThemeProvider` state (theme class applied to `<html>`) after FAB-local controls are removed.
   - **Covered by:** `src/hooks/useUICommands.test.tsx` test #1.
4. Verify assistant-issued `adjust_ui` commands still update accessibility settings such as density (data-density attr on `<html>`) through `useUICommands()` with no floating-header toggle present.
   - **Covered by:** `src/hooks/useUICommands.test.tsx` test #2.
5. Verify slash-command or command-registry theme actions still call the existing theme command path (`ThemeCommand.execute()` → `setTheme()`) instead of mutating floating-header state directly.
   - **Covered by:** `tests/shell-command-parity.test.ts` — "routes theme command execution through the setTheme setter" (calls `executeCommand("theme-bauhaus")` and asserts `setTheme` was invoked with `"bauhaus"`).
6. Verify browser-style coverage still opens the shell, renders messages, and sends through chips normally after the floating-header prop surface is reduced.
   - **Covered by:** `tests/browser-fab-chat-flow.test.tsx`.

### Negative Tests

1. Verify the floating header does not render density pills, grid toggles, or embedded search inputs.
   - **Covered by:** `tests/shell-visual-system.test.tsx` test #6 (queries density button, grid toggle, search placeholder — all absent).
2. Verify `FloatingChatShell` does not import or call `useTheme()`. It must not read or forward `gridEnabled`, `setGridEnabled`, `accessibility.density`, or `setAccessibility(...)` for local header rendering.
   - **Covered by:** `tests/shell-visual-system.test.tsx` — "confirms FloatingChatShell does not consume useTheme for local header rendering" (renders the shell, patches useTheme spy, verifies no theme state appears in the floating header output). Also verified by static import inspection.
3. Verify removing FAB-local controls does not break assistant command handling: `set_theme` and `adjust_ui` commands continue to execute.
   - **Covered by:** `src/hooks/useUICommands.test.tsx` tests #1 and #2.
4. Verify embedded-header interactions (density change, grid toggle) do not regress into affecting floating-shell lifecycle state.
   - **Covered by:** `src/frameworks/ui/ChatContainer.test.tsx` test #2 (embedded isolated from floating lifecycle events).
5. Verify no test fixtures rely on the invalid density literal `"comfortable"` in FAB-related mocks. All density mocks must use `"compact" | "normal" | "relaxed"`.
   - **Covered by:** Codebase grep (zero matches for `"comfortable"` outside this spec doc).
6. Verify `useUICommands` does not replay historical commands from restored message history on initial baseline load.
   - **Covered by:** `src/hooks/useUICommands.test.tsx` test #3.

### Edge-Case Tests

1. Verify repeated open/minimize/open shell cycles never reintroduce the removed floating density/grid controls.
   - **Covered by:** `src/components/FloatingChatShell.test.tsx` — "preserves stable accessibility hooks across repeated open and minimize cycles" (loops 3× verifying fullscreen+minimize buttons appear and density/grid/search controls remain absent each cycle).
2. Verify a full-screen floating shell preserves its conversation state while theme changes are applied through commands.
   - **Covered by:** `src/components/FloatingChatShell.test.tsx` — "toggles full screen back to default size without closing the shell" (verifies shell stays open and no state loss).
3. Verify command-driven `adjust_ui` updates still apply when the floating shell is closed and then reopened (ThemeProvider state persists independently of shell lifecycle).
   - **Covered by:** `src/hooks/useUICommands.test.tsx` — "preserves adjust_ui state on the document element after the consuming component remounts" (applies `adjust_ui`, unmounts consumer, verifies `<html>` attrs persist, remounts consumer, verifies state intact).
4. Verify embedded and floating headers can coexist in one render tree without prop leakage between the two variants.
   - **Covered by:** `tests/shell-visual-system.test.tsx` — "renders embedded and floating headers in the same tree without prop leakage" (renders both headers in one `render()` call and asserts each retains its distinct control set).
5. Verify command-driven theme changes continue to work when no conversation is active and the launcher is the only visible FAB element.
   - **Covered by:** `src/hooks/useUICommands.test.tsx` — commands are processed by the hook regardless of FAB open/closed state, because the hook lives in the chat provider layer, not inside the floating shell.
6. Verify the same `viewTransitionName` on both embedded and floating surfaces does not cause conflicts, given the mutual exclusion enforced by `GlobalChat` route policy.
   - **Covered by:** Sprint 0 route-presence tests in `src/components/GlobalChat.test.tsx` (prove they cannot coexist on the same route). Code comments in both `ChatContainer.tsx` and `FloatingChatFrame.tsx` document this assumption.

## Completion Checklist

- [x] Dedicated floating header (`FloatingChatHeader`) extracted from the dual-purpose `ChatHeader`
- [x] Embedded-only header concerns (`ChatHeader`) are isolated from the floating-shell contract
- [x] `FloatingChatShell` does not import or call `useTheme()` for local header controls
- [x] `FloatingChatFrame` forwards only lifecycle and conversationActions to the floating header — no density, grid, or search props
- [x] FAB-local density and grid toggles are removed from the floating path
- [x] Theme and accessibility changes still work through `set_theme`, `adjust_ui`, and shell commands
- [x] All density mocks use valid `ThemeProvider` values (`"compact" | "normal" | "relaxed"`)
- [x] Focused structural and browser-style decoupling regressions are added and passing
- [x] `useViewTransitionReady()` shared hook is used by both `ChatContainer` and `FloatingChatShell`
- [x] `viewTransitionName` mutual exclusion is documented with code comments in both consumers

## QA Deviations

1. **FAB-088 title/subtitle removal.** Spec `FAB-088` originally stated `FloatingChatHeader` owns "title, subtitle, conversation actions, full-screen toggle, minimize action." During Sprint 1 implementation, title and subtitle were intentionally removed from the floating header because the floating FAB shell avoids branding duplication with the embedded header. Spec `FAB-088` and `FAB-068` have been updated to reflect the shipped behavior.

## QA Findings

1. The floating header is isolated in `FloatingChatHeader`, and the oversized mixed floating/embedded contract has been removed from the floating path.
2. `FloatingChatShell` does not import or call `useTheme()`, satisfying the `FAB-095` requirement that the FAB shell not expose local density/grid controls.
3. Theme and accessibility continuity remains intact through `useUICommands()` and `useCommandRegistry()` rather than through FAB-local state.
4. The stale `"comfortable"` density mocks identified during QA were normalized to valid `ThemeProvider` density values.
5. Sprint 0 QA changes are reflected: `isFloating` prop is removed from `ChatContainer`, `useViewTransitionReady()` is shared, `viewTransitionName` mutual exclusion is documented.

## Verification

- `npm exec vitest run src/components/FloatingChatShell.test.tsx src/hooks/useUICommands.test.tsx tests/shell-visual-system.test.tsx src/frameworks/ui/ChatContainer.test.tsx src/frameworks/ui/ChatContainer.send-failure.test.tsx tests/browser-fab-chat-flow.test.tsx`
- `npm exec vitest run tests/browser-fab-mobile-density.test.tsx tests/core-policy.test.ts tests/tool-registry.integration.test.ts`
- `npm exec vitest run tests/shell-command-parity.test.ts`
- `npm run typecheck`
