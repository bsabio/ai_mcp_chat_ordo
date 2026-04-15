# Sprint 0 — Trust Recovery

> **Goal:** Restore a trustworthy public referral entry flow so affiliates can share links and QR codes that resolve to a real branded experience.
> **Spec ref:** §3.1, §4.2, §5.1
> **Prerequisite:** None.

---

## Sprint Scope

1. Establish the canonical public referral path at `/r/{code}` and keep legacy `/?ref=` links compatible through the same validation boundary.
2. Switch share surfaces and QR generation to the canonical route on the active site origin, with localhost port fallback in local development.
3. Add branded public error handling so referral failures look intentional instead of broken.

## Out Of Scope

1. No referral ledger migration or lifecycle event history yet.
2. No affiliate dashboard, charts, or self-service analytics yet.
3. No admin affiliate overview or payout review flows yet.
4. No redesign of existing admin-scoped error pages in this sprint.

---

## Task 0.1 — Canonicalize Public Referral Entry

**What:** Route all referral entry through one validated public resolver contract.

| Item | Detail |
| --- | --- |
| **Modify** | `src/proxy.ts` |
| **Create/Modify** | public `/r/[code]` route and loader surfaces under `src/app/` |
| **Modify** | `src/app/api/referral/[code]/route.ts` |
| **Spec** | §3.1 |
| **Reqs** | `AFR-020`, `AFR-050`, `AFR-051`, `AFR-054` |

Deliverables:

1. Canonical referral URLs resolve through `/r/{code}`.
2. Legacy `/?ref={code}` traffic is preserved but forced through the same validation boundary.
3. Invalid, disabled, or expired codes do not create trusted referral state.

---

## Task 0.2 — Issue Trusted Referral Visit State

**What:** Replace raw query-param trust with a validated visit contract.

| Item | Detail |
| --- | --- |
| **Modify** | referral resolver and cookie-writing surfaces |
| **Modify** | `src/proxy.ts` raw `lms_referral_code` capture path |
| **Modify** | `src/hooks/chat/chatBootstrap.ts` referral bootstrap parsing |
| **Modify** | `src/lib/chat/stream-pipeline.ts` or equivalent request paths that currently persist raw referral cookie state |
| **Spec** | §3.1, §4.2 |
| **Reqs** | `AFR-021`, `AFR-053`, `AFR-124` |

Rules:

1. The referral resolver issues a signed or tamper-evident `lms_referral_visit` cookie.
2. Raw codes are not trusted after the resolver boundary.
3. Only validated affiliate codes can produce persistent referral visit state.
4. Legacy `lms_referral_code` handling is either removed or reduced to non-authoritative compatibility behavior that cannot drive chat personalization or conversation attribution by itself.

---

## Task 0.3 — Switch Share Assets To The Canonical Route

**What:** Make every generated affiliate share asset point at the new public referral contract.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/api/qr/[code]/route.ts` |
| **Modify** | `src/lib/referrals/referral-links.ts` or shared origin-resolution helpers |
| **Modify** | `src/lib/profile/profile-service.ts` |
| **Modify** | `src/components/profile/ProfileSettingsPanel.tsx` |
| **Modify** | any profile, tool, or presenter helper that exposes the referral URL contract |
| **Spec** | §3.1, §3.5 |
| **Reqs** | `AFR-050`, `AFR-057`, `AFR-058`, `AFR-083`, `AFR-160` |

Deliverables:

1. QR images and share links resolve to `/r/{code}` on the active site origin rather than assuming a production-only domain.
2. Local and preview environments default to `http://localhost:{port}` until an explicit public origin is configured.
3. One shared origin resolver is reused across QR, profile, and tool or presenter share surfaces.

---

## Task 0.4 — Add Branded Public Failure Surfaces

**What:** Add shared public `not found`, `access denied`, referral-unavailable, and generic failure UI primitives.

| Item | Detail |
| --- | --- |
| **Create/Modify** | branded public error surfaces in `src/app/` |
| **Modify** | referral route failure handling |
| **Spec** | §3.1, §4.2 |
| **Reqs** | `AFR-055`, `AFR-056`, `AFR-125` |

Rules:

1. Public referral failure states should share branded primitives with app-level public `not found` and generic failure handling where practical.
2. Existing admin-only error surfaces remain out of scope for this sprint.

---

## Validation

1. Hosting smoke tests cover apex, `www`, canonical `/r/{code}`, and legacy `/?ref={code}` flows.
2. Referral validation tests prove valid, disabled, invalid, and expired codes each produce the correct cookie and UI behavior.
3. Bootstrap and conversation tests prove only validated visit state can drive referral-aware greeting behavior or server-side conversation attribution.
4. Share-surface regression tests cover profile view models, QR output, and tool or presenter referral-link outputs so generated affiliate links no longer leak the legacy `/?ref=` contract.
5. Origin-resolution tests cover configured production origin plus local `localhost` behavior with the active app port so QR assets do not point at the wrong host during development.

---

## Sprint 0 — Completion Checklist

- [ ] Canonical referral entry works through `/r/{code}` and preserves legacy link compatibility.
- [ ] Referral visit state is trusted only after validation.
- [ ] QR and profile share surfaces emit canonical origin-aware links.
- [ ] Public referral failures render branded product states instead of generic errors.
