# V1 Sprint 1 — Font Reduction and CSS Cleanup

> **Parent spec:** [Platform V1](spec.md) §8 Phase A, Sprint 1
> **Requirement IDs:** PLAT-011 (minimal font stack), PLAT-002 (phone-first — reduced payload)
> **Sprint 0 Baseline:** 1244 tests, 177 suites, build clean
> **Goal:** Reduce from 8 font families to 3. Remove all unused `next/font` imports, CSS variable references, and typographic indirection. Define the three retained fonts — body, display, mono — as the single canonical token layer. Fix currently undefined CSS custom properties (`--font-label`, `--font-display`, `--font-mono-theme`) that silently fall back to browser defaults. The result is a measurably smaller font payload, faster LCP, and a clean typographic foundation for deployer customization via `identity.json`.

---

## §1 Current State (What We're Fixing)

### §1.1 Eight font families — only three used intentionally

The root layout imports 8 Google Fonts and injects their CSS variables into `<body>`:

| Font family | CSS variable | `next/font` constant | Actually used by components? |
| --- | --- | --- | --- |
| **Geist** | `--font-geist-sans` | `geistSans` | Only via `--font-base` fallback in `:root` and `.theme-fluid` |
| **Geist Mono** | `--font-geist-mono` | `geistMono` | Never referenced by any utility or component |
| **Archivo** | `--font-archivo` | `archivo` | Never referenced by any utility or component |
| **League Spartan** | `--font-league-spartan` | `leagueSpartan` | Never referenced by any utility or component |
| **IBM Plex Sans** | `--font-ibm-plex-sans` | `ibmPlexSans` | **KEEP** — intended body font per V1 spec §3.9 |
| **IBM Plex Mono** | `--font-ibm-plex-mono` | `ibmPlexMono` | **KEEP** — intended mono font per V1 spec §3.9 |
| **Fraunces** | `--font-fraunces` | `fraunces` | **KEEP** — intended display font per V1 spec §3.9 |
| **Space Mono** | `--font-space-mono` | `spaceMono` | Never referenced by any utility or component |

**5 fonts imported, downloaded, and rendered by the browser for zero benefit.** This adds ~200–400KB of unnecessary font payload and blocks LCP on mobile.

### §1.2 Undefined CSS custom properties — silent failures

Three CSS variables are consumed by 15+ utility classes and component styles but **never defined** in `:root`:

| Variable | Used in | Current behavior |
| --- | --- | --- |
| `--font-label` | `text-label`, `shell-nav-label`, `shell-meta-text`, `shell-micro-text`, `shell-section-heading`, `shell-account-label`, `shell-account-avatar`, `library-kicker`, `library-meta-pill`, `library-prose th` | Falls back to browser default (Times New Roman on most systems) |
| `--font-display` | `shell-panel-heading`, `shell-brand-row`, `shell-brand-mark`, `theme-display`, `library-title`, `library-prose h1/h2/h3` | Falls back to browser default |
| `--font-mono-theme` | `@theme inline { --font-mono }` which feeds Tailwind's `font-mono` utility | Falls back to browser default monospace |

These undefined variables mean every `theme-label`, `theme-display`, and `font-mono` usage in the entire component tree renders in the browser's default serif font — not the intended IBM Plex Sans, Fraunces, or IBM Plex Mono. This is a visual regression that has been masked by development browsers that default to system fonts.

### §1.3 `--font-base` points to the wrong font

```css
:root {
  --font-base: var(--font-geist-sans, sans-serif);     /* ← currently */
}
```

Per the V1 spec, IBM Plex Sans is the canonical body font. The base variable should resolve to `--font-ibm-plex-sans`.

### §1.4 Theme overrides reference removed fonts

Two theme classes override `--font-base` with fonts that should no longer exist:

| Theme | Current `--font-base` | Issue |
| --- | --- | --- |
| `.theme-fluid` | `var(--font-geist-sans, sans-serif)` | Geist is being removed |
| `.theme-skeuomorphic` | `var(--font-inter, sans-serif)` | Inter was never imported — always falls back to `sans-serif` |
| `.theme-bauhaus` | `'Syne', 'Helvetica', ...` | External font name — no `next/font` import exists |
| `.theme-swiss` | `'Inter', 'Helvetica Neue', ...` | External font name — no `next/font` import exists |

After this sprint, all themes use the same three font families. Theme differentiation comes from spacing, borders, colors, and shadows — not fonts. This simplifies the deployer story: changing `identity.json` fonts changes everything.

### §1.5 Impact on deployers

Sprint 0 defined `identity.json` with no `fonts` field. Sprint 1 adds a `fonts` field to the schema so deployers can document which font families their instance uses. The `next/font` imports in `layout.tsx` remain the source of truth for font loading — the `fonts` config field is validated metadata that Sprint 1 stores but does not wire into dynamic font loading. To change fonts, a deployer edits both `config/identity.json` (metadata) and `src/app/layout.tsx` (imports). Dynamic font loading from config alone (no TypeScript edits) is deferred — it requires build-time `next/font` integration that is out of scope for V1. The V1 spec §3.9 statement "overridable via `identity.json`" refers to the full V1 vision; Sprint 1 delivers the config schema foundation.

---

## §2 Target Architecture

### §2.1 Three font families — one job each

| Purpose | Font family | CSS variable | Tailwind utility | Used by |
| --- | --- | --- | --- | --- |
| **Body** | IBM Plex Sans | `--font-body` | `theme-body`, `font-sans` | All body text, labels, navigation, UI elements |
| **Display** | Fraunces | `--font-display` | `theme-display` | Headings, brand wordmarks, editorial titles |
| **Mono** | IBM Plex Mono | `--font-mono` | `theme-mono`, `font-mono` | Code blocks, inline code, technical content |

### §2.2 CSS variable mapping — clean, defined, canonical

```css
:root {
  /* ── Typography — 3 families ──────────────────────────── */
  --font-body:    var(--font-ibm-plex-sans, sans-serif);
  --font-display: var(--font-fraunces, serif);
  --font-mono:    var(--font-ibm-plex-mono, monospace);

  /* Backward compatibility alias */
  --font-base: var(--font-body);
  --font-label: var(--font-body);
}
```

`--font-label` becomes an alias for `--font-body` — labels are body text with different size/weight/case, not a different font family. This is the typographic truth: label styling is a tier (size + tracking + weight), not a font choice.

### §2.3 Modified files

| File | Change |
| --- | --- |
| `src/app/layout.tsx` | Remove 5 font imports (Geist, Geist_Mono, Archivo, League_Spartan, Space_Mono). Remove their `variable` constants. Remove from `<body>` className. Keep: IBM_Plex_Sans, IBM_Plex_Mono, Fraunces. |
| `src/app/globals.css` | Define `--font-body`, `--font-display`, `--font-mono` in `:root`. Point `--font-base` → `--font-body`. Point `--font-label` → `--font-body`. Remove `--font-mono-theme`. Update `@theme inline` to use new variables. Update theme overrides to remove external font references. |
| `config/identity.json` | Add `fonts` field with `{ "body": "IBM Plex Sans", "display": "Fraunces", "mono": "IBM Plex Mono" }`. |
| `src/lib/config/defaults.ts` | Add `fonts` field to `InstanceIdentity` type and `DEFAULT_IDENTITY` constant. |
| `src/lib/config/instance.schema.ts` | Add validation for `fonts` field in identity schema. |

### §2.4 No new files

This sprint creates zero new source files. It modifies 5 existing files. It creates 1 test file.

### §2.5 Config schema update

The `InstanceIdentity` interface gains a `fonts` field:

```typescript
export interface InstanceIdentity {
  // ... existing fields ...
  fonts?: {
    body: string;      // Google Font family name, e.g. "IBM Plex Sans"
    display: string;   // Google Font family name, e.g. "Fraunces"
    mono: string;      // Google Font family name, e.g. "IBM Plex Mono"
  };
}
```

**Validation rules:**
- `fonts`: optional object. When absent, defaults to `{ body: "IBM Plex Sans", display: "Fraunces", mono: "IBM Plex Mono" }`.
- `fonts.body`: non-empty string, max 100 characters
- `fonts.display`: non-empty string, max 100 characters
- `fonts.mono`: non-empty string, max 100 characters
- All three sub-fields required when `fonts` is present (no partial override — prevents accidental missing font)

---

## §3 Implementation Details

### §3.1 Layout font cleanup

**Before (8 imports, 8 variables on body):**

```typescript
import {
  Archivo, Fraunces, Geist, Geist_Mono,
  IBM_Plex_Mono, IBM_Plex_Sans, League_Spartan, Space_Mono,
} from "next/font/google";

// ... 8 const blocks ...

<body className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} ${leagueSpartan.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} ${fraunces.variable} ${spaceMono.variable} antialiased`}>
```

**After (3 imports, 3 variables on body):**

```typescript
import {
  Fraunces,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
} from "next/font/google";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

// ...

<body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${fraunces.variable} antialiased`}>
```

### §3.2 CSS variable consolidation

**`:root` additions (new canonical variables):**

```css
:root {
  /* ── Typography — 3 families ──────────────────────────── */
  --font-body:    var(--font-ibm-plex-sans, sans-serif);
  --font-display: var(--font-fraunces, serif);
  --font-mono:    var(--font-ibm-plex-mono, monospace);

  /* Legacy aliases — consumed by existing utilities */
  --font-base:  var(--font-body);
  --font-label: var(--font-body);
}
```

**`:root` removals:**
- `--font-base: var(--font-geist-sans, sans-serif);` → replaced by block above

**`@theme inline` update:**

```css
@theme inline {
  /* ... existing color tokens ... */
  --font-sans: var(--font-body);
  --font-mono: var(--font-mono);
}
```

Note: Currently `@theme inline { --font-mono: var(--font-mono-theme) }` references an undefined variable `--font-mono-theme`. After this sprint, `:root` defines `--font-mono: var(--font-ibm-plex-mono, monospace)`, so the `@theme inline` line changes to reference that newly defined `:root` variable. This is a forward reference to a `:root`-level definition, not a circular self-reference.

### §3.3 Theme override cleanup

All four theme classes (`theme-bauhaus`, `theme-swiss`, `theme-skeuomorphic`, `theme-fluid`) have their `--font-base` overrides **removed**. Themes differentiate by visual treatment (spacing, borders, colors, shadows, radii) — not by font family.

**Before:**
```css
.theme-bauhaus { --font-base: 'Syne', 'Helvetica', 'Arial', sans-serif; }
.theme-swiss { --font-base: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; }
.theme-skeuomorphic { --font-base: var(--font-inter, sans-serif); }
.theme-fluid { --font-base: var(--font-geist-sans, sans-serif); }
```

**After:** All four `--font-base` lines deleted. The `:root` font variables cascade into every theme uniformly.

### §3.4 MermaidRenderer — no change needed

`MermaidRenderer.tsx` reads `--font-base` at runtime via `getComputedStyle()`. Since `--font-base` is now an alias for `--font-body` which resolves to IBM Plex Sans, this works correctly with no code change.

### §3.5 Tailwind `font-mono` — fixed silently

Currently, `@theme inline { --font-mono: var(--font-mono-theme); }` references an undefined `--font-mono-theme`. After this sprint, `--font-mono` is defined in `:root` and the `@theme inline` section references it directly. All Tailwind `font-mono` utility uses now resolve to IBM Plex Mono instead of browser-default monospace.

### §3.6 Component utility classes — no changes needed

All component-level font references use the abstract utility classes (`theme-body`, `theme-display`, `theme-label`, `font-mono`), not direct font-family declarations. Since those utilities are defined in `globals.css` and reference the CSS custom properties, they automatically resolve to the correct fonts after the variable consolidation. Zero component file changes.

### §3.7 Config defaults update

```typescript
// src/lib/config/defaults.ts
export const DEFAULT_IDENTITY: InstanceIdentity = {
  // ... existing fields ...
  fonts: {
    body: "IBM Plex Sans",
    display: "Fraunces",
    mono: "IBM Plex Mono",
  },
};
```

### §3.8 Config identity.json update

```json
{
  "name": "Studio Ordo",
  "shortName": "Ordo",
  "tagline": "Strategic AI Advisory",
  "description": "...",
  "domain": "studioordo.com",
  "logoPath": "/ordo-avatar.png",
  "markText": "O",
  "copyright": "© 2026 Studio Ordo. All rights reserved.",
  "serviceChips": ["Studio Ordo", "Strategic AI Advisory", "Orchestration Training"],
  "fonts": {
    "body": "IBM Plex Sans",
    "display": "Fraunces",
    "mono": "IBM Plex Mono"
  }
}
```

---

## §4 Migration and Backward Compatibility

### §4.1 Visual behavior change — intentional improvement

This sprint **intentionally changes** the rendered appearance in two ways:

1. **Labels, navigation, headings** now render in IBM Plex Sans / Fraunces instead of browser-default serif. This is a visual *fix*, not a regression — the undefined `--font-label` and `--font-display` variables were bugs.
2. **Body text** shifts from Geist to IBM Plex Sans. This is the intended typographic identity per V1 spec §3.9.

### §4.2 Backward compatibility — config absent

When `identity.json` has no `fonts` field (including all existing deployments), the defaults are `{ body: "IBM Plex Sans", display: "Fraunces", mono: "IBM Plex Mono" }` — identical to what the layout loads. No behavioral difference.

### §4.3 Existing test preservation

All 1244 existing tests must pass. No test assertions reference font family names or CSS variable values. The layout test in Sprint 0 asserts on metadata (title/description), not on `<body>` className — the removal of 5 font variable classes from `<body>` does not break any assertion.

---

## §5 Test Specification

### §5.1 Positive tests (expected behavior works)

| # | Test name | What it verifies |
| --- | --- | --- |
| P1 | `layout body className contains exactly 3 font variables` | Render `RootLayout` → body has `ibmPlexSans.variable`, `ibmPlexMono.variable`, `fraunces.variable`, and no others. Uses regex: should contain `--font-ibm-plex-sans`, `--font-ibm-plex-mono`, `--font-fraunces`; should NOT contain `--font-geist`, `--font-archivo`, `--font-league`, `--font-space-mono`. |
| P2 | `layout imports exactly 3 font families` | Static analysis: read `layout.tsx` source → import statement contains only `Fraunces`, `IBM_Plex_Mono`, `IBM_Plex_Sans`. No `Geist`, `Geist_Mono`, `Archivo`, `League_Spartan`, `Space_Mono`. |
| P3 | `identity config with fonts field validates successfully` | Config with `fonts: { body: "Custom Sans", display: "Custom Serif", mono: "Custom Mono" }` → validates without error, returns all three font names |
| P4 | `identity config without fonts field uses defaults` | Config with no `fonts` key → `getInstanceIdentity().fonts` returns `{ body: "IBM Plex Sans", display: "Fraunces", mono: "IBM Plex Mono" }` |
| P5 | `DEFAULT_IDENTITY includes fonts with correct defaults` | Import `DEFAULT_IDENTITY` → `.fonts.body` is `"IBM Plex Sans"`, `.fonts.display` is `"Fraunces"`, `.fonts.mono` is `"IBM Plex Mono"` |
| P6 | `CSS defines --font-body variable in :root` | Parse `globals.css` → `:root` block contains `--font-body: var(--font-ibm-plex-sans` |
| P7 | `CSS defines --font-display variable in :root` | Parse `globals.css` → `:root` block contains `--font-display: var(--font-fraunces` |
| P8 | `CSS defines --font-mono variable in :root` | Parse `globals.css` → `:root` block contains `--font-mono: var(--font-ibm-plex-mono` |
| P9 | `CSS --font-base aliases --font-body` | Parse `globals.css` → `--font-base: var(--font-body)` exists in `:root` |
| P10 | `CSS --font-label aliases --font-body` | Parse `globals.css` → `--font-label: var(--font-body)` exists in `:root` |
| P11 | `@theme inline --font-sans references --font-body` | Parse `globals.css` → `@theme inline` block contains `--font-sans: var(--font-body)` |
| P12 | `@theme inline --font-mono references --font-mono` | Parse `globals.css` → `@theme inline` block contains `--font-mono: var(--font-mono)` |

### §5.2 Negative tests (invalid states prevented)

| # | Test name | What it verifies |
| --- | --- | --- |
| N1 | `throws when fonts.body is empty string` | Config with `fonts: { body: "", display: "Serif", mono: "Mono" }` → `ConfigValidationError` with `"identity.fonts.body: required non-empty string"` |
| N2 | `throws when fonts is partial (missing mono)` | Config with `fonts: { body: "Sans", display: "Serif" }` → `ConfigValidationError` with `"identity.fonts.mono: required non-empty string"` |
| N3 | `throws when fonts.display exceeds max length` | `fonts.display` of 101 characters → error includes `"identity.fonts.display: max 100 characters"` |
| N4 | `throws when fonts is not an object` | `fonts: "IBM Plex Sans"` → `ConfigValidationError` with `"identity.fonts: must be an object with body, display, and mono"` |
| N5 | `removed fonts do not appear in globals.css` | Parse `globals.css` → no occurrence of `--font-geist-sans`, `--font-geist-mono`, `--font-archivo`, `--font-league-spartan`, `--font-space-mono` |
| N6 | `no theme class overrides --font-base` | Parse `globals.css` → `.theme-bauhaus`, `.theme-swiss`, `.theme-skeuomorphic`, `.theme-fluid` blocks do not contain `--font-base:` |

### §5.3 Edge tests (boundary conditions)

| # | Test name | What it verifies |
| --- | --- | --- |
| E1 | `fonts field at boundary: 100-character font name` | `fonts.body` of exactly 100 characters → valid, no error |
| E2 | `fonts field with Unicode characters` | `fonts: { body: "Noto Sans JP", display: "しっぽり明朝", mono: "Source Code Pro" }` → valid |
| E3 | `identity.json with fonts and all other fields` | Complete identity including `fonts`, `serviceChips`, `copyright`, `accentColor` → all fields validated, none lost |
| E4 | `MermaidRenderer reads --font-base correctly` | `getComputedStyle().getPropertyValue("--font-base")` resolves to a non-empty string (not empty due to undefined variable) — validates the CSS chain `--font-base` → `--font-body` → `--font-ibm-plex-sans` |

### §5.4 Test count summary

| Category | Count |
| --- | --- |
| Positive (P1–P12) | 12 |
| Negative (N1–N6) | 6 |
| Edge (E1–E4) | 4 |
| **Total new tests** | **22** |
| Deleted tests | 0 |
| **Net change** | **+22** |

---

## §6 Test Implementation Patterns

### §6.1 CSS static analysis tests

Several tests verify the contents of `globals.css` and `layout.tsx` as source files. This is intentional — these are architectural constraints, not runtime behavior. The tests read the file from disk and assert on its contents:

```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

describe("font reduction — CSS variables", () => {
  const css = readSource("src/app/globals.css");

  it("P6: CSS defines --font-body variable in :root", () => {
    expect(css).toMatch(/--font-body:\s*var\(--font-ibm-plex-sans/);
  });

  it("N5: removed fonts do not appear in globals.css", () => {
    expect(css).not.toContain("--font-geist-sans");
    expect(css).not.toContain("--font-geist-mono");
    expect(css).not.toContain("--font-archivo");
    expect(css).not.toContain("--font-league-spartan");
    expect(css).not.toContain("--font-space-mono");
  });
});
```

### §6.2 Layout import verification

```typescript
describe("font reduction — layout imports", () => {
  const layout = readSource("src/app/layout.tsx");

  it("P2: layout imports exactly 3 font families", () => {
    expect(layout).toContain("IBM_Plex_Sans");
    expect(layout).toContain("IBM_Plex_Mono");
    expect(layout).toContain("Fraunces");
    expect(layout).not.toContain("Geist,");
    expect(layout).not.toContain("Geist_Mono");
    expect(layout).not.toContain("Archivo");
    expect(layout).not.toContain("League_Spartan");
    expect(layout).not.toContain("Space_Mono");
  });
});
```

### §6.3 Config validation tests

These extend the existing config test infrastructure from Sprint 0, using temp directories and `resetConfigCache()`:

```typescript
describe("identity.fonts validation", () => {
  it("N2: throws when fonts is partial (missing mono)", () => {
    writeConfig("identity.json", {
      ...validIdentity,
      fonts: { body: "Sans", display: "Serif" },
    });
    expect(() => loadInstanceConfig()).toThrow(ConfigValidationError);
    try {
      loadInstanceConfig();
    } catch (e) {
      expect((e as ConfigValidationError).violations).toContain(
        "identity.fonts.mono: required non-empty string"
      );
    }
  });
});
```

---

## §7 Acceptance Criteria

1. `npm run build` produces zero TypeScript errors.
2. All 1244 existing tests pass without assertion changes.
3. All 22 new tests pass.
4. `src/app/layout.tsx` imports exactly 3 fonts: `IBM_Plex_Sans`, `IBM_Plex_Mono`, `Fraunces`.
5. `src/app/globals.css` `:root` defines `--font-body`, `--font-display`, and `--font-mono` — all three resolve to the retained font families.
6. `--font-label` is defined and resolves to `--font-body` (not undefined).
7. No CSS variable in `globals.css` references `--font-geist-sans`, `--font-geist-mono`, `--font-archivo`, `--font-league-spartan`, or `--font-space-mono`.
8. No theme class (`.theme-bauhaus`, `.theme-swiss`, `.theme-skeuomorphic`, `.theme-fluid`) overrides `--font-base`.
9. `config/identity.json` includes a `fonts` field with the default font family names.
10. Identity schema validates the `fonts` field when present (all three sub-fields required, non-empty, max 100 chars).
11. `InstanceIdentity` type includes optional `fonts` field with `body`, `display`, `mono` sub-fields.

---

## §8 User Value Assessment

### §8.1 Founder (Keith) — immediate value

- **Faster page loads.** Removing 5 unused fonts eliminates ~200–400KB of blocking network requests. LCP improves measurably on mobile connections.
- **Visual consistency.** Fixing the undefined `--font-label` and `--font-display` variables means labels, navigation, headings, and code blocks render in the intended fonts instead of browser defaults. The site looks designed, not broken.
- **Brand coherence.** IBM Plex Sans + Fraunces + IBM Plex Mono is a distinctive, professional typographic identity. No more Geist (Vercel's default) diluting the brand.

### §8.2 Students — learning value

- **Clean architecture lesson.** A 3-variable font system demonstrates the principle of minimalism in design systems: fewer decisions, more consistency, easier maintenance.
- **CSS custom property cascading.** Students see how `--font-body` → `--font-base` → `--font-label` aliasing works and why indirection enables theming without component changes.

### §8.3 Deployers — configuration value

- **Clear font contract.** The `fonts` field in `identity.json` documents which three fonts the system uses. Even though Sprint 1 doesn't dynamically load fonts from config, the metadata is visible and forward-compatible.
- **Simpler mental model.** "There are three fonts. They are these three fonts." No more wondering what Geist, Archivo, or League Spartan are doing.

---

## §9 Out of Scope

| Item | Deferred to |
| --- | --- |
| Dynamic font loading from `identity.json` `fonts` field | Future — requires build-time `next/font` integration |
| Font subsetting or variable font optimization | TD-B (Knuth Performance Audit) |
| Per-theme font overrides | Removed by design — themes differentiate by spacing/color/shape |
| Lighthouse performance measurement of font reduction | TD-B |
| Dashboard elimination | V1 Sprint 2 |

---

## §10 Sprint Boundary Verification

After Sprint 1 is complete, verify:

```text
1. npx vitest run                    → 1266 tests passing (1244 + 22 new)
2. npm run build                     → clean, zero errors
3. npm run lint                      → no new warnings
4. grep -c "from.*next/font" src/app/layout.tsx
                                     → exactly 1 import statement with 3 fonts
5. grep "font-geist\|font-archivo\|font-league\|font-space-mono" src/app/globals.css
                                     → zero matches
6. grep "font-body\|font-display\|font-mono" src/app/globals.css | head -5
                                     → all three defined in :root
```
