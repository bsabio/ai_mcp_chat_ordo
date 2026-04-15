# Homepage Chat Shell Verification

> **Purpose:** Manual verification checklist and evidence log for the homepage chat shell after Sprint 3.
> **Scope:** Scroll-boundary behavior, keyboard visibility, footer reachability, and homepage stage integrity.

---

## Current Evidence

| Environment | Status | Evidence |
| --- | --- | --- |
| Deterministic eval harness via `npm run test:homepage-evals` | Pass | Scenario-based checks now confirm the home route renders embedded chat directly in `main`, keeps footer outside the viewport stage, keeps the composer separate from the message viewport, removes the legacy route-level hero wrapper, and only shows intro content in hero state |
| Chrome desktop via Playwright against `http://localhost:3001/` | Partial pass | No runtime errors from Next.js MCP, footer starts at the initial fold boundary, composer is visible in the first screen, homepage stage and footer are separated correctly |
| Safari desktop | Pending manual | Requires real trackpad momentum verification |
| iOS Safari | Pending manual | Requires software keyboard and touch-scroll verification |
| Android Chrome | Pending manual | Requires reduced-height and keyboard verification |

Chrome desktop notes from live Sprint 3 QA:

1. `get_errors` on the Next.js runtime returned no browser/runtime errors.
2. Live DOM geometry showed the footer starting at the fold boundary and the composer remaining visible in the first screen.
3. Browser automation confirmed the shell/stage/footer composition, but true trackpad momentum and mobile keyboard behavior still require manual device-level verification.

---

## Required Browsers

1. Safari on macOS
2. Safari on iPhone
3. Chrome on macOS
4. Chrome on Android

---

## Core Pass Criteria

1. The homepage loads into a dedicated chat stage with the composer visible at the bottom of the first screen.
2. The footer is not visible in the default homepage viewport.
3. Scrolling inside the message region does not accidentally transfer the same gesture to the outer page at the top or bottom boundary.
4. Starting a scroll gesture outside the message region still allows the user to reach the real footer intentionally.
5. The composer remains visible and usable while the software keyboard is open on mobile.

---

## Safari Desktop

1. Load `/` and confirm the footer is below the fold.
Pass when the first screen shows nav plus chat stage only.
2. Use a trackpad inside the message viewport and scroll to the top boundary.
Pass when continued upward momentum does not expose the footer.
3. Use a trackpad inside the message viewport and scroll to the bottom boundary.
Pass when continued downward momentum does not expose the footer.
4. Start the same gesture from the nav or stage margin outside the message viewport.
Pass when the outer page scrolls and the footer becomes reachable.

---

## iOS Safari

1. Focus the composer to open the software keyboard.
Pass when the composer remains visible and the stage remains usable.
2. With the keyboard open, scroll within the message viewport.
Pass when the message region scrolls without revealing the footer.
3. Close the keyboard and start a page scroll outside the message viewport.
Pass when the footer becomes reachable through intentional outer-page scroll.

---

## Chrome Desktop

1. Repeat the top-boundary and bottom-boundary scroll tests inside the message viewport.
Pass when boundary-lock behavior matches Safari desktop.
2. Verify mouse-wheel and trackpad behavior separately if available.
Pass when neither input mode leaks default chat scrolling into page scrolling.

Current status:

- Runtime/browser errors: Pass
- Footer below fold on initial load: Pass
- Composer visible in initial viewport: Pass
- True manual wheel/trackpad boundary behavior: Pending local manual confirmation

---

## Android Chrome

1. Focus the composer to open the keyboard.
Pass when the composer remains visible and the message region compresses first.
2. Scroll inside the message viewport while the route is visually reduced in height.
Pass when the stage remains non-scrolling and the footer stays below the fold.
3. Start a scroll outside the message viewport after dismissing the keyboard.
Pass when the footer is reachable intentionally.

---

## Evidence To Record

1. Browser name and version
2. Pass/fail for each scenario above
3. Any browser-specific notes about momentum scrolling, keyboard resize, or footer exposure
4. Whether follow-up work belongs in Sprint 3 polish or in a new defect ticket

## Sprint 3 Outcome

1. No further message-rhythm polish was required from the live Chrome QA pass.
2. The remaining acceptance work is manual browser/device confirmation for Safari and mobile keyboard behavior.
3. Sprint 4 added a deterministic eval harness so the chat-first route contract is checked before manual browser QA.