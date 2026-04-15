# QA Report 01 — Unimplemented Features

**Severity range:** P0 Critical / P1 High  
**Scope:** Entire feature systems specified in the spec that have zero or near-zero implementation.

---

## DEF-001 · P0 Critical — Notification System Does Not Exist

**Spec reference:** spec.md §Notification System, Sprint 4  
**Expected:** Unified `NotificationEvent` / `NotificationDispatcher` architecture with chat and push channels, volume control, digest policies, and `config/notifications.json`.  
**Actual:** No notification contracts, no dispatcher, no signal evaluator, no config file. The only notification-adjacent code is `DeferredJobNotificationDispatcher` in `src/lib/jobs/`, which is scoped exclusively to deferred job completion — not admin events.

**Impact:** The operator receives zero proactive alerts for signups, lead arrivals, health warnings, or job failures. The spec's design principle #3 ("The system talks to you") is entirely unfulfilled.

**Missing artifacts:**
- `src/lib/notifications/NotificationEvent.ts` — event contract
- `src/lib/notifications/NotificationDispatcher.ts` — channel router
- `src/lib/notifications/channels/ChatChannel.ts` — conversation projector
- `src/lib/notifications/channels/PushChannel.ts` — web-push adapter
- `src/lib/notifications/AdminSignalEvaluator.ts` — threshold detector
- `config/notifications.json` — volume policies

---

## DEF-002 · P0 Critical — Feature Flag System Does Not Exist

**Spec reference:** spec.md §System Configuration, Sprint 3  
**Expected:** `config/flags.json` with runtime `getFeatureFlags()` / `isFeatureEnabled()` API. The System page should display toggleable flags (referral program, user model selection, lead queue visibility).  
**Actual:** No `config/flags.json`. No flag loader module. No `getFeatureFlags()` function anywhere in `src/`. The System page is a static placeholder card.

**Impact:** No feature can be gated at runtime. The referral program toggle, model selection policy, and lead queue visibility are all hardcoded or absent.

**Missing artifacts:**
- `config/flags.json` — flag definitions
- `src/lib/config/feature-flags.ts` — loader and query API

---

## DEF-003 · P0 Critical — Model Registry Does Not Exist

**Spec reference:** spec.md §System Configuration, Sprint 3  
**Expected:** `config/models.json` with provider/model/tier hierarchy, `getModelRegistry()`, fallback chains, and human-friendly tier labels (Fast / Balanced / Powerful).  
**Actual:** No `config/models.json`. Model selection is hardcoded in test fixtures (`getModelFallbacks()` in `tests/chat-policy.test.ts`). No admin-facing model configuration surface.

**Impact:** The operator cannot see which models are available, enable/disable providers, or understand the tier labeling. The "Powerful" / "Balanced" / "Fast" vocabulary from the spec is absent.

**Missing artifacts:**
- `config/models.json` — provider + model definitions
- `src/lib/config/model-registry.ts` — registry loader with tier labels

---

## DEF-004 · P1 High — User Management CRUD Does Not Exist

**Spec reference:** spec.md §People & Profiles, Sprint 2  
**Expected:** `listUsers()` / `countUsers()` / `updateUserRole()` data layer, `GET /api/admin/users` and `PATCH /api/admin/users/[userId]/role` API routes, card-based user list with role badges, user detail page at `/admin/users/[userId]`.  
**Actual:** The users page is a single static placeholder card saying "People surface pending." No API routes for user listing or role changes exist under `/api/admin/users/`. The `[userId]` dynamic route directory exists but contains no `page.tsx`.

**Impact:** The operator cannot see who signed up, cannot change roles, and has zero visibility into the user base. The spec's gap #1 ("You're flying blind on users") remains exactly as described.

**Missing artifacts:**
- `src/lib/admin/user-data-layer.ts` — listUsers, countUsers, updateUserRole
- `src/app/api/admin/users/route.ts` — GET user list
- `src/app/api/admin/users/[userId]/role/route.ts` — PATCH role
- `src/app/admin/users/page.tsx` — functional user list (currently placeholder)
- `src/app/admin/users/[userId]/page.tsx` — user detail page

---

## DEF-005 · P1 High — Profile Visibility System Does Not Exist

**Spec reference:** spec.md §People & Profiles, Sprint 2  
**Expected:** `profile_visibility` (`"private"` | `"visible"`), `profile_bio` (≤280 chars), and `profile_display_name` stored in `UserPreference`. Profile settings page should offer visibility controls.  
**Actual:** `UserProfileViewModel` in `src/lib/profile/types.ts` contains only: id, email, name, credential, pushNotificationsEnabled, affiliateEnabled, referralCode, referralUrl, qrCodeUrl, roles. No visibility, bio, or display name fields.

**Impact:** Users cannot control profile visibility. No bio or public display name is possible. The foundation for future public profiles is absent.

**Missing artifacts:**
- `profile_visibility` preference key
- `profile_bio` preference key
- `profile_display_name` preference key
- Updated `UserProfileViewModel` with new fields
- Profile settings UI for visibility controls

---

## DEF-006 · P1 High — Signup Event Emission Does Not Exist

**Spec reference:** spec.md §People & Profiles, Sprint 2  
**Expected:** `RegisterUserInteractor` emits a `user_signup` event on successful registration, feeding the notification system.  
**Actual:** No `user_signup` event emission found in registration flow. Without the notification system (DEF-001), there would be nowhere to send it — but the event contract itself is also missing.

**Impact:** New signups are invisible to the operator. The spec's gap #1 ("Every signup is invisible") persists.

---

## DEF-007 · P1 High — User Model Preference Does Not Exist

**Spec reference:** spec.md §System Configuration, Sprint 3  
**Expected:** When `allowUserModelSelection` is enabled, profile settings show a "Model" section with tier labels. `preferred_model` stored in `UserPreference`.  
**Actual:** No `preferred_model` preference. No model selection UI in profile settings. No `allowUserModelSelection` policy check.

**Impact:** Users cannot influence which model handles their conversations. The entire model preference pipeline is absent.

---

## DEF-008 · P1 High — Referral Feature Flag Wiring Does Not Exist

**Spec reference:** Sprint 3 §Task 4 — Wire referral behavior to feature flags  
**Expected:** Referral program gated by `referral_program_enabled` flag. Toggling the flag disables referral code generation, hides referral UI, etc.  
**Actual:** Referral system exists (affiliate API route, referral code generation) but is not gated by any feature flag. It's either always-on or controlled by environment variables — not by the admin-configurable flag system.

**Impact:** The operator cannot toggle referrals on/off from the admin UI.
