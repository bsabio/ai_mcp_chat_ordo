# Sprint 2 - Command Surface Unification

> **Goal:** Make keyboard and slash-command surfaces consume the same canonical
> navigation and theme-command sources instead of drifting from the shell.
> **Spec ref:** `SND-015`, `SND-035`, `SND-062`, `SND-090` through `SND-093`,
> `SND-113`, `SND-114`
> **Prerequisite:** Sprint 1 committed
> **Test count target:** 575 existing + 6 new = 581 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/components/CommandPalette.tsx` | `CommandPalette()` locally creates `NavigationCommand` and `ThemeCommand` instances for home, corpus, dashboard, five themes, and ten corpus document shortcuts |
| `src/hooks/useCommandRegistry.ts` | `useCommandRegistry()` locally creates navigation commands for corpus/training/studio, theme commands, and three no-op `PlaceholderCommand`s |
| `src/hooks/chat/useChatComposerController.ts` | `useChatComposerController()` consumes `{ executeCommand, findCommands }` from `useCommandRegistry()` and clears the composer when slash-command execution succeeds |
| `src/core/commands/NavigationCommands.ts` | `NavigationCommand` constructor signature is `(id, title, category, navigate, path)` |
| `src/core/commands/ThemeCommands.ts` | `ThemeCommand` constructor signature is `(id, title, category, setTheme, themeName)` |
| `src/core/commands/Command.ts` | `Command` requires `id`, `title`, `category`, optional `icon`, and `execute()` |
| `src/core/entities/mentions.ts` | `MentionItem` uses `{ id, name, category, description? }`; mention command items use category `"command"` |
| `src/core/entities/theme.ts` | `Theme` is the five-value design-theme union used by `ThemeCommand` and `ThemeProvider` |
| `src/components/ThemeProvider.tsx` | `useTheme()` exposes `setTheme(theme)` for typed theme command execution |
| `src/lib/shell/shell-navigation.ts` | Sprint 0 and Sprint 1 now define the canonical shell route model, including `SHELL_ROUTES`, `PRIMARY_NAV_ITEMS`, `getShellRouteById()`, and `isShellRouteActive()` |

## Inputs From Prior Sprints

Sprint 0 established the shell route source of truth in
`src/lib/shell/shell-navigation.ts`.

Sprint 1 made header and footer consume that source directly, so the command
surfaces must now align to the same route ids and labels already rendered in the
visible shell:

1. canonical primary navigation is `home`, `corpus`, and `dashboard`
2. dead route ids such as `training` and `studio` are already excluded from the
   implemented shell and must not survive in command surfaces
3. shared shell truth now lives in exported shell helpers rather than inline UI
   arrays

Sprint 2 should preserve those decisions rather than introducing a second route
or label taxonomy for keyboard and slash-command paths.

---

## Task 2.1 - Create shared command projection helpers

**What:** Add a shell-command projection layer that turns canonical shell data
into `Command` objects and mention items for different surfaces.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/shell/shell-commands.ts` |
| **Spec** | `SND-035`, `SND-090` through `SND-093` |

### Task 2.1 Notes

The new helper module should generate:

1. navigation commands from canonical route metadata
2. theme commands from one shared theme-definition list
3. mention items or lookup projections for slash-command usage
4. corpus document shortcuts only if they are derived from real corpus metadata
   rather than inline literals

Channel-specific labels are acceptable, but command ids and destinations must be
shared.

Use explicit exported helpers so palette and slash-command consumers can share
one underlying source while still receiving surface-specific projections. A
structure close to the following is sufficient:

```ts
export interface ShellCommandDefinition {
  id: string;
  title: string;
  category: string;
  kind: "navigation" | "theme";
  href?: string;
  themeName?: Theme;
  mentionTitle?: string;
}

export function createPaletteCommands(...): Command[];
export function createRegistryCommands(...): Command[];
export function createCommandMentions(...): MentionItem[];
```

The sprint should keep one canonical command-definition layer even if it emits
multiple projection helpers.

Use shell route ids as the basis for navigation command ids wherever possible so
palette and slash-command assertions can compare the same stable identifiers.

### Task 2.1 Verify

```bash
npm run typecheck
```

---

## Task 2.2 - Refactor CommandPalette to consume shared command projections

**What:** Remove its local route/theme arrays and generate palette commands from
shared shell-command helpers.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/CommandPalette.tsx` |
| **Spec** | `SND-015`, `SND-035`, `SND-062`, `SND-090`, `SND-091`, `SND-113` |

### Task 2.2 Notes

Preserve existing keyboard behavior and dialog semantics. The sprint is about
command truth, not about redesigning the overlay.

Retain corpus-document shortcuts only if they can be generated from the same
document metadata already used by the corpus index, such as `getDocuments()`,
rather than from inline declarations.

This task should remove all local `new NavigationCommand(...)` and
`new ThemeCommand(...)` arrays from `CommandPalette.tsx`. The component may
still hold UI-local filtering state, keyboard state, and dialog state.

If no client-safe canonical corpus command source exists at implementation time,
remove the inline corpus document shortcuts rather than preserving hardcoded
drift.

### Task 2.2 Verify

```bash
npm run test -- tests/browser-overlays.test.tsx
```

---

## Task 2.3 - Refactor useCommandRegistry to consume the same sources

**What:** Remove duplicated navigation/theme arrays and no-op placeholders from
the slash-command registry.

| Item | Detail |
| --- | --- |
| **Modify** | `src/hooks/useCommandRegistry.ts` |
| **Spec** | `SND-015`, `SND-062`, `SND-090` through `SND-093`, `SND-114` |

### Task 2.3 Notes

The registry should continue returning:

1. `executeCommand(commandId)`
2. `findCommands(query)`

But both should now operate on shared canonical command definitions.

Avoid presenting no-op tool placeholders as slash commands. If a command is not
implemented, it should not be marketed as available shell behavior.

This sprint should remove the local `PlaceholderCommand` class entirely unless
it is retained only for non-user-visible internal testing, which is not the
current use case.

Registry navigation commands should converge on the same user-facing titles used
by the shell and palette rather than keeping a separate `Go to ...` naming
scheme.

### Task 2.3 Verify

```bash
npm run test -- src/hooks/chat/useChatComposerController.test.tsx
```

---

## Task 2.4 - Add parity tests for palette and slash commands

**What:** Add tests that fail when command palette and slash-command surfaces
diverge on ids, destinations, or core labels.

| Item | Detail |
| --- | --- |
| **Create** | `tests/shell-command-parity.test.ts` |
| **Spec** | `SND-035`, `SND-090` through `SND-093`, `SND-113`, `SND-114` |

### Task 2.4 Notes

Assert at minimum:

1. shared navigation command ids are stable across both surfaces
2. theme command ids are stable across both surfaces
3. destinations for shared nav commands are identical
4. removed placeholder commands are absent from slash-command results and
   palette command ids
5. route ids that were dead in the old registry, such as `training` and
   `studio`, are not reintroduced through shared projections unless Sprint 0
   explicitly classified them as valid external or legacy metadata

The point is to make future drift obvious.

Prefer direct assertions over the shared helper outputs, then add one thin
consumer-level assertion for `useCommandRegistry()` so parity is checked both at
the projection layer and at the hook boundary.

### Task 2.4 Verify

```bash
npm run test -- tests/shell-command-parity.test.ts
```

---

## Completion Checklist

- [x] Command palette no longer owns its own navigation/theme arrays
- [x] Slash-command registry no longer owns its own navigation/theme arrays
- [x] Placeholder shell commands are removed from user-visible command surfaces
- [x] Shared command helpers define one canonical source for navigation and theme command ids
- [x] Command-parity tests exist and pass

## QA Deviations

- Corpus document shortcuts were removed from `CommandPalette.tsx` instead of
   being retained as hardcoded literals because Sprint 2 found no existing
   client-safe canonical corpus command source comparable to the shell route
   model.
