# Browser UI Verification Matrix

## Purpose

This checklist defines the minimum browser verification surface for the UI shell,
 floating chat, overlays, motion, and media features. It is the acceptance matrix
 for the browser UI hardening package.

## Browser Classes

| Browser | Priority | Notes |
| --- | --- | --- |
| Safari desktop | High | Primary sticky, blur, and overlay risk browser |
| iOS Safari | Critical | Primary viewport, safe-area, keyboard, and touch risk browser |
| Chrome desktop | High | Reference implementation for modern enhancement behavior |
| Android Chrome | High | Dynamic browser-chrome and keyboard validation target |
| Firefox desktop | Medium | Fallback appearance and progressive enhancement validation target |

## Scenario Matrix

| Scenario | Safari | iOS Safari | Chrome | Android Chrome | Firefox |
| --- | --- | --- | --- | --- | --- |
| Root shell renders without clipped content | Required | Required | Required | Required | Required |
| Footer remains reachable without shell breakage | Required | Required | Required | Required | Required |
| Floating chat opens and closes correctly | Required | Required | Required | Required | Required |
| Floating chat respects bottom safe area | Check | Required | Check | Required | Check |
| Embedded chat header remains visible while scrolling | Required | Required | Required | Required | Required |
| Command palette opens centered and remains usable with keyboard | Required | Required | Required | Required | Required |
| Content modal remains usable on small viewports | Required | Required | Required | Required | Required |
| Expanded tool modal remains scrollable and visually stable | Required | Required | Required | Required | Required |
| Mentions menu remains anchored and selectable | Required | Required | Required | Required | Required |
| Account menu dismisses correctly on pointer and tap | Required | Required | Required | Required | Required |
| Audio player manual play works | Required | Required | Required | Required | Required |
| Audio ready toast does not collide with safe area | Check | Required | Check | Required | Check |
| Reduced motion materially lowers visible movement | Required | Required | Required | Required | Required |
| Blur fallback remains legible if blur is absent | Required | Required | Required | Required | Required |
| View-transition absence does not affect correctness | Required | Required | Check | Required | Required |

## Required Manual Checks

1. Load the home page and verify the main shell has no clipped bottom content.
2. Open floating chat on a non-home route and verify the launcher and shell sit above the bottom safe area.
3. Focus the main text input on a mobile browser and verify the shell remains usable when the software keyboard opens.
4. Open the command palette and verify the dialog remains fully reachable.
5. Open the content modal and expanded tool modal and verify internal scrolling works without body-scroll confusion.
6. Trigger mentions and verify keyboard selection, pointer selection, and dismissal behavior.
7. Open the account menu and verify pointer/tap outside dismissal behavior.
8. Trigger audio generation and verify manual play, pause, seek, and ready-state UI.
9. Re-run the same screens with reduced motion enabled at the OS level.
10. Confirm no layout depends on blur or view transitions for correctness.

## Sprint 5 Acceptance Evidence Checklist

### Shell rendering

Pass criteria:
Shell content is not clipped, sticky surfaces remain visible while scrolling,
and floating chat respects safe-area padding and closes cleanly.

Evidence:

- Home shell render pass/fail by browser class
- Floating chat open/close pass/fail by browser class
- Embedded chat header visibility pass/fail by browser class

### Command palette usability

Pass criteria:
The command palette opens from keyboard input, remains reachable on small
viewports, accepts keyboard navigation, and dismisses without trapping the page
in a broken overlay state.

Evidence:

- Keyboard open/close result
- Arrow navigation and Enter selection result
- Small-viewport reachability result

### Mentions and account menu behavior

Pass criteria:
Mention suggestions remain anchored to the input, expose selectable options,
and both mention and account menus dismiss correctly on pointer/tap outside.

Evidence:

- Mentions anchor and selection result
- Account menu outside-dismiss result
- Touch target usability notes

### Audio playback and manual-play path

Pass criteria:
Audio generation handles loading, manual play works when autoplay is blocked or
deferred, and the ready-state affordance does not collide with browser chrome
or safe areas.

Evidence:

- Audio generate/load result
- Manual play/pause/seek result
- Ready toast placement result
- Fallback behavior notes when autoplay is blocked

### Reduced-motion behavior

Pass criteria:
Reduced motion removes high-amplitude motion, preserves readability, and does
not change shell correctness, menu usability, or audio controls.

Evidence:

- OS reduced-motion run result
- Motion differences observed
- Any residual cosmetic-only caveats

## Automated Verification Commands

1. `npm run browser:verify`
2. `npm run browser:verify:quality`
3. `npm run quality`
4. `npm run lhci` against the intended production target when a fresh
   Lighthouse comparison is required

## Evidence To Record

| Item | Evidence |
| --- | --- |
| Browser/version | Exact version or device class |
| Scenario | Which matrix row was tested |
| Result | Pass, fail, or partial |
| Notes | Any visible caveat or fallback behavior |
| Screenshot/video | Optional but recommended for failures |

## Release Rule

A browser class is acceptable for release when all required scenarios pass and
 any remaining caveats are non-blocking cosmetic differences rather than layout,
 input, media, or navigation failures.
