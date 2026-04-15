# Sprint 3 - QA Acceptance And Polish

> **Goal:** Lock the homepage shell behind durable acceptance evidence, complete browser QA, and make any small message-rhythm or spacing adjustments still needed to satisfy the spec without reopening architecture scope.
> **Spec ref:** `HCS-053`, `HCS-060` through `HCS-088`
> **Prerequisite:** Sprint 2 complete
> **Test count target:** 517 existing + 4 new = 521 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `docs/_specs/homepage-chat-shell/artifacts/homepage-chat-shell-verification.md` | Now includes Sprint 3 evidence notes, current Chrome desktop observations, and remaining manual Safari/mobile checks |
| `tests/homepage-shell-ownership.test.tsx` | Now covers shell-level footer separation and document scroll ownership markers |
| `tests/homepage-shell-layout.test.tsx` | Now covers stage boundedness, viewport-stage composition, embedded workspace containment, and reduced-height invariants |
| `src/hooks/useMessageScrollBoundaryLock.test.tsx` | Sprint 2 hook-level coverage remains the direct boundary-lock behavior guardrail |
| `src/frameworks/ui/MessageList.tsx` | Current homepage message rhythm and header spacing live here; no additional Sprint 3 polish was required after live Chrome QA |
| `package.json` | `quality`, `browser:verify`, and `build` are the final verification anchors |

---

## Task 3.1 - Complete acceptance-level homepage shell tests

**What:** Add the remaining behavior-first tests that connect shell ownership, stage layout, and scroll behavior into a single acceptance surface.

| Item | Detail |
| --- | --- |
| **Modify** | `tests/homepage-shell-ownership.test.tsx` |
| **Modify** | `tests/homepage-shell-layout.test.tsx` |
| **Spec** | `HCS-070` through `HCS-076`, `HCS-080` through `HCS-088` |

### Task 3.1 Notes

Make sure the acceptance suite proves:

- homepage first screen is the chat stage
- footer is below the fold and not embedded in the stage
- outer-page footer reachability still exists conceptually outside message-originating gestures
- mobile reduced-height state keeps the composer visible

### Task 3.1 Verify

```bash
npm run test -- tests/homepage-shell-ownership.test.tsx tests/homepage-shell-layout.test.tsx
```

---

## Task 3.2 - Apply only spec-safe message rhythm polish

**What:** Tune short-conversation spacing or embedded-mode alignment only if needed to satisfy the message-settling requirement.

| Item | Detail |
| --- | --- |
| **Modify** | `src/frameworks/ui/MessageList.tsx` |
| **Optional Modify** | `src/frameworks/ui/ChatContainer.tsx` |
| **Spec** | `HCS-053`, `HCS-082`, `HCS-083` |

### Task 3.2 Notes

This sprint is not an excuse to redesign the homepage. Keep changes narrow:

- spacing rhythm
- alignment near the composer
- removal of dead space that makes short conversations feel detached

Do not change shell ownership, footer composition, or navigation scope here.

### Task 3.2 Verify

```bash
npm run test -- tests/homepage-shell-layout.test.tsx
```

---

## Task 3.3 - Produce final browser QA evidence

**What:** Run and record the browser verification outcomes for the homepage shell.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/homepage-chat-shell/artifacts/homepage-chat-shell-verification.md` |
| **Spec** | `HCS-060` through `HCS-069`, `HCS-076`, `HCS-087`, `HCS-088` |

### Task 3.3 Notes

The completed document should record pass/fail status and any browser-specific notes for:

- Safari desktop
- iOS Safari
- Chrome desktop
- Android Chrome

### Task 3.3 Verify

```bash
npm run browser:verify
```

---

## Task 3.4 - Run final release-grade verification

**What:** Confirm the homepage shell changes survive the full project quality gate.

| Item | Detail |
| --- | --- |
| **Verify Only** | whole workspace |
| **Spec** | `HCS-070` through `HCS-088` |

### Task 3.4 Notes

Run the full suite only after all homepage-shell tasks are complete.

### Task 3.4 Verify

```bash
npm run quality && npm run build
```

---

## Completion Checklist

- [x] Acceptance tests cover stage, footer, composer, and reduced-height behavior together
- [x] Any final UI polish stays inside `MessageList` or embedded chat layout boundaries
- [x] Browser verification evidence is recorded in the homepage shell verification doc
- [x] Final quality and build verification pass

## QA Deviations

No architectural deviations. One acceptance clarification remains: Chrome desktop runtime evidence was captured in this environment, but Safari desktop, iOS Safari, and Android Chrome still require manual device/browser confirmation for momentum-scroll and software-keyboard behavior. That remaining work is documented in `docs/_specs/homepage-chat-shell/artifacts/homepage-chat-shell-verification.md` rather than treated as an implementation defect.

