# Theme System Hardening

Status: proposed
Owner: platform-ui
Scope: eliminate first-paint theme flash, unify persisted theme state, harden validation, and reduce component-level theme escapes

## Problem

The current theme runtime is architecturally strong but still leaks at the boundaries that matter most in production.

Observed gaps:

1. the initial HTML does not carry the active theme state, so the page can paint in the wrong mode before the client provider mounts
2. the provider persists only part of the advertised control surface, which creates drift between the manifest, hydration, and server-stored preferences
3. non-theme accessibility axes are accepted from storage and APIs with weak validation
4. some components still bypass the token system with hard-coded visual values
5. preset behavior is useful but currently acts as a convenience mutation, not a canonical persisted state

## Goals

1. first paint should already match the active theme whenever the state is knowable from cookies or server preferences
2. all persisted theme controls should round-trip through one validated contract
3. client, server, cookies, local storage, and preference APIs should share one normalization layer
4. presets should remain bounded shortcuts unless we intentionally promote them to first-class stored state later
5. high-risk visual escape hatches should move back onto semantic tokens

## Non-Goals

1. no free-form end-user theming
2. no replacement of the manifest system
3. no broad restyling of the existing visual language
4. no conversion of presets into a separate theme mode in this phase

## Target Architecture

### 1. Shared Theme State Module

Create one shared module that owns:

1. theme state types
2. accessibility defaults
3. normalization of stored values
4. cookie key definitions
5. preference key serialization
6. document attribute generation

This module becomes the contract between:

1. server layout bootstrap
2. client ThemeProvider
3. preference hydration
4. localStorage restore
5. cookie restore

### 2. Server Bootstrap

The root layout should compute an initial theme snapshot from:

1. authenticated server preferences
2. theme cookies
3. default theme fallback

The layout should seed:

1. html class list
2. data-theme
3. data-theme-mode
4. data-density
5. optional data-color-blind
6. core CSS variable overrides for typography rhythm

Add a before-interactive bootstrap script that handles the one thing the server cannot know: system dark mode and legacy localStorage-only returning users.

### 3. Persistence Contract

Persist these axes end-to-end:

1. theme
2. dark_mode
3. density
4. font_size
5. line_height
6. letter_spacing
7. color_blind_mode

Decision for this phase:

1. preset remains transient and derived
2. preset is not stored as canonical state because it is a shortcut that mutates the persisted axes above

### 4. Validation Contract

All ingress points must validate against the same bounded values:

1. cookies
2. localStorage
3. preferences API hydration
4. client command application
5. server bootstrap

Invalid values must fall back safely instead of being cast through.

### 5. Visual Escape Reduction

Prioritize hard-coded escapes in:

1. error states
2. account-role badges and simulation indicators
3. renderer fallbacks and diagnostics

The standard is not zero literals everywhere. The standard is no avoidable literals where the design system already has a semantic token.

## Required Code Changes

1. add shared theme-state utilities under src/lib/theme/
2. update src/components/ThemeProvider.tsx to consume the shared contract
3. update src/app/layout.tsx to seed html theme state on the server
4. expand src/adapters/UserPreferencesDataMapper.ts to accept line_height and letter_spacing
5. keep /api/preferences as the server persistence boundary for authenticated users
6. update focused UI components that still use obvious hard-coded theme escapes

## Testing Requirements

1. provider tests must cover server-seeded initial state
2. provider tests must cover hydration of line_height and letter_spacing
3. shared theme-state tests must cover cookie parsing, preference parsing, and document attribute generation
4. preference tests must cover the newly allowed keys
5. existing theme command tests must stay green

## Acceptance Criteria

1. first paint no longer defaults to the wrong theme when the state is available from server preferences or cookies
2. legacy localStorage-only users are corrected before hydration through the bootstrap script
3. server persistence includes line_height and letter_spacing
4. invalid stored values are ignored safely across all restore paths
5. preset semantics are documented as transient shortcuts, not canonical stored state
6. the repo contains a spec package that documents this contract and the remaining future work

## Follow-On Work

1. optionally promote preset to first-class stored state if product needs exact preset recall rather than derived state recall
2. extend the same shared contract into any future theme inspection tooling
3. audit remaining raw rgba and hard-coded color literals in secondary surfaces