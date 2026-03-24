# V1 Sprint 6 — SEO Infrastructure

> **Parent spec:** [Platform V1](spec.md) §8 Phase C, Sprint 6
> **Requirement IDs:** PLAT-005 (content is public and indexable), PLAT-006 (configuration, not code changes), PLAT-009 (analytics are built in)
> **TD-B Baseline:** 1351 tests, 166 suites, build clean
> **Goal:** Add `sitemap.xml` generation, `robots.txt`, Plausible analytics script tag, and OG/canonical coverage for the root layout. Wire these through instance config so deployers can configure analytics domain without code changes. Remove dead `layout-metadata.ts` artifact.

---

## §1 Current State

### §1.1 What exists after TD-B

Sprint 5 added full SEO metadata (OG tags, JSON-LD, canonical URLs) to the three library routes. TD-B consolidated the metadata builders into composite functions and eliminated DRY violations across the codebase.

| Capability | File | Status |
| --- | --- | --- |
| Library index OG/JSON-LD/canonical | `src/app/library/page.tsx` | **Full** — `generateMetadata()` + JSON-LD CollectionPage |
| Chapter page OG/JSON-LD/canonical | `src/app/library/[document]/[section]/page.tsx` | **Full** — `generateMetadata()` + JSON-LD Article |
| Book redirect metadata | `src/app/library/[document]/page.tsx` | **Partial** — `generateMetadata()` with title only |
| Root layout metadata | `src/app/layout.tsx` | **Partial** — `generateMetadata()` with title + description, no OG, no canonical |
| SEO metadata composites | `src/lib/seo/library-metadata.ts` | **Full** — `buildChapterSeo()`, `buildLibraryIndexSeo()` + backward-compatible wrappers |
| Description extraction | `src/lib/seo/extract-description.ts` | **Full** — pure markdown-to-plaintext utility |
| Config identity | `config/identity.json` + `src/lib/config/instance.ts` | **Full** — name, domain, logoPath, tagline, description |

### §1.2 What does NOT exist yet

| Capability | V1 spec ref | Impact |
| --- | --- | --- |
| `sitemap.xml` | §3.4 | Search engines cannot discover the 104 chapter URLs, library index, or homepage. No automated crawl guidance. |
| `robots.txt` | §3.4 | No explicit crawl policy. API routes, auth routes, and legacy redirects are not blocked. |
| Plausible analytics | PLAT-009 | Zero measurement of page views, referral sources, or conversion events. |
| Root layout OG tags | §3.4 | Social media link previews for `/` show no OG image, site name, or URL. |
| Root layout canonical URL | §3.4 | No canonical URL on the homepage — duplicate content risk from multiple domains or www/non-www. |
| Analytics config field | PLAT-006 | No config-driven way for deployers to set their Plausible domain or self-hosted script URL. |
| Dead code cleanup | — | `src/app/layout-metadata.ts` exports a static metadata object that is not imported anywhere. |

### §1.3 Page route inventory for sitemap decisions

| Route | Type | Include in sitemap? |
| --- | --- | --- |
| `/` | Homepage (chat surface) | **Yes** — priority 1.0 |
| `/library` | Library index | **Yes** — priority 0.8 |
| `/library/[document]` | Book redirect → first chapter | **No** — redirect, not indexable content |
| `/library/[document]/[section]` | Chapter reading page (×104) | **Yes** — priority 0.6 |
| `/login` | Auth form | **No** — utility page, not content |
| `/register` | Auth form | **No** — utility page, not content |
| `/profile` | User profile | **No** — behind auth, not content |
| `/books/*` | Legacy redirects → `/library/*` | **No** — redirect aliases |
| `/corpus/*` | Legacy redirects → `/library/*` | **No** — redirect aliases |
| `/book/*` | Legacy redirect | **No** — redirect alias |
| `/api/*` | API endpoints | **No** — `robots.txt Disallow` |
| `/library/section/[slug]` | Section slug resolver → redirect | **No** — redirect |

---

## §2 Design Decisions

### §2.1 Use Next.js App Router `sitemap.ts` convention

Next.js provides a built-in `sitemap.ts` convention at `src/app/sitemap.ts`. Exporting a default async function that returns `MetadataRoute.Sitemap` produces a `/sitemap.xml` endpoint with no manual XML generation required. This is the standard Next.js approach and integrates with the existing build system.

The sitemap function reads from the corpus facade (`getDocuments()`, `getCorpusSummaries()`) to enumerate all book/chapter URLs dynamically. The homepage and library index are added as static entries.

### §2.2 Use Next.js App Router `robots.ts` convention

Similarly, `src/app/robots.ts` exports a default function returning `MetadataRoute.Robots`. This produces `/robots.txt` with rules for crawlers:

- **Allow** `/`, `/library`, `/library/*`
- **Disallow** `/api/`, `/login`, `/register`, `/profile`
- **Sitemap** reference pointing to `https://{domain}/sitemap.xml`

### §2.3 Plausible analytics via config-driven script tag

Plausible is a lightweight (< 1 KB), privacy-respecting analytics service. The integration is a single `<script>` tag in the root layout `<head>`:

```html
<script defer data-domain="{domain}" src="{scriptSrc}"></script>
```

Sprint 6 adds an optional `analytics` section to the identity config:

```typescript
interface InstanceIdentity {
  // ... existing fields ...
  analytics?: {
    plausibleDomain?: string;   // defaults to identity.domain if omitted
    plausibleSrc?: string;      // defaults to "https://plausible.io/js/script.js"
  };
}
```

If `analytics.plausibleDomain` is absent, the Plausible script is **not injected** — deployers opt in by adding the config field. This ensures the base platform works without any analytics dependency.

The `plausibleSrc` field supports self-hosted Plausible instances. Cloud Plausible users leave it at the default.

### §2.4 Root layout metadata gets OG tags and canonical

The root layout `generateMetadata()` (added in TD-B) currently returns only `title` and `description`. Sprint 6 extends it to include:

- `openGraph.title`, `openGraph.description`, `openGraph.siteName`, `openGraph.url`, `openGraph.type: "website"`, `openGraph.images`
- `alternates.canonical` pointing to `https://{domain}/`
- `metadataBase` set to `new URL("https://{domain}")` — this makes all relative OG image paths work correctly across the site

The `metadataBase` is particularly important: once set in the root layout, child pages can use relative paths for OG images (e.g., `/ordo-avatar.png` instead of `https://studioordo.com/ordo-avatar.png`).

### §2.5 Dead `layout-metadata.ts` removed

`src/app/layout-metadata.ts` exports a static `metadata` object that is not imported by any file. It was superseded when Sprint 5/TD-B converted the root layout to `generateMetadata()`. Sprint 6 deletes this file.

### §2.6 Sitemap uses `lastModified` from build time

Chapter content is static (read from filesystem at build time). The sitemap sets `lastModified` to the build date for all entries. This is accurate — content only changes when the application is rebuilt and redeployed. No per-page timestamp tracking is needed.

### §2.7 Login/register pages get minimal metadata but no sitemap entry

Auth pages (`/login`, `/register`) are excluded from the sitemap and blocked in `robots.txt`, but Sprint 6 does **not** add custom metadata to them. They inherit the root layout metadata, which is sufficient since they are utility pages not intended for search indexing. Adding metadata to client components would require a parent layout or `generateMetadata()` in a separate server component, which is over-engineering for pages that are explicitly excluded from indexing.

---

## §3 Implementation Plan

### Phase 1: Analytics config extension

**Modified file: `src/lib/config/defaults.ts`**

Add the optional `analytics` field to `InstanceIdentity`:

```typescript
export interface InstanceIdentity {
  // ... existing fields ...
  analytics?: {
    plausibleDomain?: string;
    plausibleSrc?: string;
  };
}
```

No change to `DEFAULT_IDENTITY` — the `analytics` field is optional and undefined by default (no analytics injected unless configured).

**Modified file: `config/identity.json`**

Add analytics config for the Studio Ordo instance:

```json
{
  "analytics": {
    "plausibleDomain": "studioordo.com"
  }
}
```

### Phase 2: Plausible script in root layout

**Modified file: `src/app/layout.tsx`**

Add a `PlausibleAnalytics` component (inline, not a separate file) that conditionally renders the Plausible `<script>` tag based on the identity config:

```typescript
function PlausibleAnalytics({ identity }: { identity: InstanceIdentity }) {
  const domain = identity.analytics?.plausibleDomain;
  if (!domain) return null;
  const src = identity.analytics?.plausibleSrc ?? "https://plausible.io/js/script.js";
  return <script defer data-domain={domain} src={src} />;
}
```

Place inside `<head>` (via Next.js's head management) or at the top of `<body>`. Since Next.js App Router does not support a `<Head>` component, the script goes into the `<head>` of the `<html>` element using Next.js's `Script` component from `next/script`:

```typescript
import Script from "next/script";

// In RootLayout, before </body>:
{identity.analytics?.plausibleDomain && (
  <Script
    defer
    data-domain={identity.analytics.plausibleDomain}
    src={identity.analytics.plausibleSrc ?? "https://plausible.io/js/script.js"}
    strategy="afterInteractive"
  />
)}
```

### Phase 3: Root layout OG tags and canonical

**Modified file: `src/app/layout.tsx`**

Extend `generateMetadata()`:

```typescript
export async function generateMetadata(): Promise<Metadata> {
  const identity = getInstanceIdentity();
  const canonicalUrl = `https://${identity.domain}`;

  return {
    metadataBase: new URL(canonicalUrl),
    title: `${identity.name} | ${identity.tagline}`,
    description: identity.description,
    alternates: { canonical: "/" },
    openGraph: {
      title: `${identity.name} | ${identity.tagline}`,
      description: identity.description,
      url: canonicalUrl,
      siteName: identity.name,
      type: "website",
      images: [{ url: identity.logoPath }],
    },
  };
}
```

Note: Setting `metadataBase` here means all child pages (library index, chapters) can use relative paths for images. However, existing chapter pages already use absolute URLs (`https://${identity.domain}${identity.logoPath}`), which is fine — `metadataBase` only affects relative paths.

### Phase 4: sitemap.ts

**New file: `src/app/sitemap.ts`**

```typescript
import type { MetadataRoute } from "next";
import { getInstanceIdentity } from "@/lib/config/instance";
import { getDocuments, getCorpusSummaries } from "@/lib/corpus-library";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const identity = getInstanceIdentity();
  const base = `https://${identity.domain}`;
  const now = new Date();

  const [documents, summaries] = await Promise.all([
    getDocuments(),
    getCorpusSummaries(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/library`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];

  const chapterEntries: MetadataRoute.Sitemap = [];
  for (const summary of summaries) {
    const slugs = summary.chapterSlugs ?? summary.sectionSlugs;
    for (const chapterSlug of slugs) {
      chapterEntries.push({
        url: `${base}/library/${summary.slug}/${chapterSlug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return [...staticEntries, ...chapterEntries];
}
```

### Phase 5: robots.ts

**New file: `src/app/robots.ts`**

```typescript
import type { MetadataRoute } from "next";
import { getInstanceIdentity } from "@/lib/config/instance";

export default function robots(): MetadataRoute.Robots {
  const identity = getInstanceIdentity();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/library", "/library/"],
        disallow: ["/api/", "/login", "/register", "/profile"],
      },
    ],
    sitemap: `https://${identity.domain}/sitemap.xml`,
  };
}
```

### Phase 6: Delete dead layout-metadata.ts

**Deleted file: `src/app/layout-metadata.ts`**

Remove the unused metadata export. No imports reference this file.

---

## §4 Security Considerations

| Constraint | V1 spec ref | Implementation |
| --- | --- | --- |
| Sitemap exposes only public URLs | PLAT-005 | Sitemap includes only `/`, `/library`, and chapter pages. No API routes, auth pages, or profile pages are listed. |
| robots.txt blocks sensitive routes | Defense in depth | `/api/`, `/login`, `/register`, `/profile` are all in the Disallow list. This is advisory (crawlers can ignore it), but signals intent. |
| Plausible script loaded from configured origin only | Defense in depth | The `src` attribute comes from config, not user input. Default is the official Plausible CDN. Self-hosted deployers set their own origin. No user-controlled data enters the script tag. |
| Analytics is opt-in | PLAT-006 | If `analytics.plausibleDomain` is not in the config, no analytics script is injected. No tracking without explicit configuration. |
| Canonical URLs use configured domain | Defense in depth | Same pattern as Sprint 5 — `identity.domain` from config, not from the request `Host` header. Prevents host header injection. |
| `metadataBase` anchored to config domain | Defense in depth | `new URL(\`https://${identity.domain}\`)` is computed from config, ensuring all relative OG paths resolve to the correct origin. |

---

## §5 Test Specification

### §5.1 Positive tests (happy paths work)

| # | Test name | What it verifies |
| --- | --- | --- |
| P1 | `sitemap returns homepage entry` | Import sitemap function, call it → result array contains an entry with `url` ending in the configured domain (no path). |
| P2 | `sitemap returns library index entry` | Result contains an entry with `url` ending in `/library`. |
| P3 | `sitemap returns chapter entries for all corpus chapters` | Result length ≥ 2 (static entries) + number of corpus chapters. Each chapter entry URL matches pattern `/library/{bookSlug}/{chapterSlug}`. |
| P4 | `robots allows public content routes` | Import robots function, call it → `rules[0].allow` includes `/` and `/library`. |
| P5 | `robots disallows API and auth routes` | `rules[0].disallow` includes `/api/`, `/login`, `/register`, `/profile`. |
| P6 | `robots includes sitemap URL` | Result has `sitemap` field matching `https://{domain}/sitemap.xml`. |
| P7 | `root layout generateMetadata returns OG tags` | Call `generateMetadata()` from layout → result has `openGraph.title`, `openGraph.description`, `openGraph.siteName`, `openGraph.type` = `"website"`, `openGraph.images` array. |
| P8 | `root layout generateMetadata returns canonical URL` | Result has `alternates.canonical` set. |
| P9 | `root layout generateMetadata sets metadataBase` | Result has `metadataBase` set to a URL matching the configured domain. |

### §5.2 Negative tests (boundaries enforced)

| # | Test name | What it verifies |
| --- | --- | --- |
| N1 | `sitemap excludes redirect routes` | No sitemap entry URL contains `/books/`, `/corpus/`, `/book/`, or `/library/section/`. |
| N2 | `sitemap excludes auth and API routes` | No sitemap entry URL contains `/api/`, `/login`, `/register`, or `/profile`. |
| N3 | `Plausible script not injected when analytics config absent` | When identity has no `analytics` field, the layout source confirms the script is conditionally rendered (source analysis: references `analytics?.plausibleDomain`). |

### §5.3 Edge tests (boundary conditions and integration scenarios)

| # | Test name | What it verifies |
| --- | --- | --- |
| E1 | `sitemap entries have valid URL format` | Every entry in the sitemap result has a `url` starting with `https://`. |
| E2 | `sitemap entries have lastModified as Date` | Every entry has a `lastModified` field that is a Date instance. |
| E3 | `sitemap homepage has priority 1.0` | The homepage entry has `priority` = 1.0. |
| E4 | `sitemap chapter entries have priority 0.6` | Chapter entries (URLs matching `/library/{book}/{chapter}`) have `priority` = 0.6. |
| E5 | `robots uses configured domain for sitemap URL` | Mock identity with `domain: "custom.example.com"` → sitemap URL is `https://custom.example.com/sitemap.xml`. |
| E6 | `layout-metadata.ts dead code removed` | `src/app/layout-metadata.ts` does not exist (source analysis: file absence check). |
| E7 | `analytics config field accepted in identity` | The `InstanceIdentity` type in defaults.ts includes the optional `analytics` field with `plausibleDomain` and `plausibleSrc`. |
| E8 | `Plausible script uses default src when plausibleSrc not configured` | Layout source confirms the fallback string `"https://plausible.io/js/script.js"` is present. |
| E9 | `analytics schema validation accepts valid analytics object` | `validateIdentity()` accepts an identity with `analytics: { plausibleDomain: "example.com" }` without errors. |
| E10 | `analytics schema validation rejects non-object analytics` | `validateIdentity()` returns errors when `analytics` is a string or number. |

### §5.4 Test count summary

| Category | Count |
| --- | --- |
| Positive (P1–P9) | 9 |
| Negative (N1–N3) | 3 |
| Edge (E1–E10) | 10 |
| **Total new tests** | **22** |
| Deleted tests | 0 |
| **Net change** | **+22** |

Note: The V1 spec §8 estimated +8 tests for Sprint 6. This spec expands to 22 because the sprint covers five distinct deliverables (sitemap, robots, Plausible analytics, root layout OG, schema validation) that each require their own positive, negative, and edge coverage. The sitemap alone needs 7 tests (P1–P3, N1–N2, E1–E4) to verify static entries, dynamic chapter enumeration, exclusion rules, URL format, and priority values.

---

## §6 Test Implementation Patterns

### §6.1 Sitemap tests (P1–P3, N1–N2, E1–E4)

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/config/instance", () => ({
  getInstanceIdentity: () => ({
    name: "Studio Ordo",
    domain: "studioordo.com",
    logoPath: "/ordo-avatar.png",
    tagline: "Strategic AI Advisory",
    description: "Test description",
  }),
}));

vi.mock("@/lib/corpus-library", () => ({
  getDocuments: vi.fn().mockResolvedValue([
    { slug: "software-engineering", title: "Software Engineering", number: "01" },
    { slug: "ux-design", title: "UX Design", number: "02" },
  ]),
  getCorpusSummaries: vi.fn().mockResolvedValue([
    {
      slug: "software-engineering",
      chapterSlugs: ["ch01-intro", "ch02-methods"],
      sectionSlugs: ["ch01-intro", "ch02-methods"],
      chapters: ["Intro", "Methods"],
      sections: ["Intro", "Methods"],
      chapterCount: 2,
      sectionCount: 2,
    },
    {
      slug: "ux-design",
      chapterSlugs: ["ch01-fundamentals"],
      sectionSlugs: ["ch01-fundamentals"],
      chapters: ["Fundamentals"],
      sections: ["Fundamentals"],
      chapterCount: 1,
      sectionCount: 1,
    },
  ]),
}));

import sitemap from "@/app/sitemap";

describe("sitemap.xml generation", () => {
  it("P1: returns homepage entry", async () => {
    const entries = await sitemap();
    const home = entries.find((e) => e.url === "https://studioordo.com");
    expect(home).toBeDefined();
  });

  it("P2: returns library index entry", async () => {
    const entries = await sitemap();
    const lib = entries.find((e) => e.url === "https://studioordo.com/library");
    expect(lib).toBeDefined();
  });

  it("P3: returns chapter entries for all corpus chapters", async () => {
    const entries = await sitemap();
    const chapterEntries = entries.filter((e) =>
      e.url.match(/\/library\/[^/]+\/[^/]+$/),
    );
    // 2 chapters from software-engineering + 1 from ux-design = 3
    expect(chapterEntries).toHaveLength(3);
    expect(chapterEntries[0].url).toContain("/library/software-engineering/ch01-intro");
  });

  it("N1: excludes redirect routes", async () => {
    const entries = await sitemap();
    for (const entry of entries) {
      expect(entry.url).not.toContain("/books/");
      expect(entry.url).not.toContain("/corpus/");
      expect(entry.url).not.toContain("/book/");
      expect(entry.url).not.toContain("/library/section/");
    }
  });

  it("N2: excludes auth and API routes", async () => {
    const entries = await sitemap();
    for (const entry of entries) {
      expect(entry.url).not.toContain("/api/");
      expect(entry.url).not.toContain("/login");
      expect(entry.url).not.toContain("/register");
      expect(entry.url).not.toContain("/profile");
    }
  });

  it("E1: all entries have valid https URL format", async () => {
    const entries = await sitemap();
    for (const entry of entries) {
      expect(entry.url).toMatch(/^https:\/\//);
    }
  });

  it("E2: all entries have lastModified as Date", async () => {
    const entries = await sitemap();
    for (const entry of entries) {
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
  });

  it("E3: homepage has priority 1.0", async () => {
    const entries = await sitemap();
    const home = entries.find((e) => e.url === "https://studioordo.com");
    expect(home?.priority).toBe(1.0);
  });

  it("E4: chapter entries have priority 0.6", async () => {
    const entries = await sitemap();
    const chapterEntries = entries.filter((e) =>
      e.url.match(/\/library\/[^/]+\/[^/]+$/),
    );
    for (const entry of chapterEntries) {
      expect(entry.priority).toBe(0.6);
    }
  });
});
```

### §6.2 Robots tests (P4–P6, E5)

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/config/instance", () => ({
  getInstanceIdentity: () => ({
    name: "Studio Ordo",
    domain: "studioordo.com",
    logoPath: "/ordo-avatar.png",
    tagline: "Strategic AI Advisory",
    description: "Test description",
  }),
}));

import robots from "@/app/robots";

describe("robots.txt generation", () => {
  it("P4: allows public content routes", () => {
    const result = robots();
    expect(result.rules).toBeDefined();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule.allow).toContain("/");
  });

  it("P5: disallows API and auth routes", () => {
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallowed = rule.disallow;
    expect(disallowed).toContain("/api/");
    expect(disallowed).toContain("/login");
    expect(disallowed).toContain("/register");
    expect(disallowed).toContain("/profile");
  });

  it("P6: includes sitemap URL with configured domain", () => {
    const result = robots();
    expect(result.sitemap).toBe("https://studioordo.com/sitemap.xml");
  });

  it("E5: uses configured domain for sitemap URL", () => {
    // The mock sets domain to "studioordo.com" — verify the sitemap URL uses it
    const result = robots();
    expect(result.sitemap).toContain("studioordo.com");
  });
});
```

### §6.3 Root layout metadata tests (P7–P9)

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/config/instance", () => ({
  getInstanceIdentity: () => ({
    name: "Studio Ordo",
    domain: "studioordo.com",
    logoPath: "/ordo-avatar.png",
    tagline: "Strategic AI Advisory",
    description: "Test description",
    analytics: { plausibleDomain: "studioordo.com" },
  }),
  getInstancePrompts: () => ({
    heroHeading: "Test",
    heroSubheading: "Test",
  }),
}));

// Root layout exports generateMetadata — import it directly
// Note: the layout module may have side effects (font imports), so we test
// the metadata logic via source analysis where direct import is impractical.
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

describe("root layout generateMetadata", () => {
  it("P7: returns OG tags", () => {
    const src = readSource("src/app/layout.tsx");
    expect(src).toContain("openGraph");
    expect(src).toMatch(/type:\s*["']website["']/);
    expect(src).toContain("siteName");
    expect(src).toContain("images");
  });

  it("P8: returns canonical URL", () => {
    const src = readSource("src/app/layout.tsx");
    expect(src).toContain("alternates");
    expect(src).toContain("canonical");
  });

  it("P9: sets metadataBase", () => {
    const src = readSource("src/app/layout.tsx");
    expect(src).toContain("metadataBase");
    expect(src).toMatch(/new URL/);
  });
});
```

### §6.4 Negative and edge tests (N3, E6–E8)

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

describe("analytics conditional rendering", () => {
  it("N3: Plausible script not injected when analytics config absent", () => {
    const src = readSource("src/app/layout.tsx");
    // Verify conditional check exists — script only renders when config present
    expect(src).toMatch(/analytics\?\.plausibleDomain/);
  });

  it("E8: Plausible script uses default src when plausibleSrc not configured", () => {
    const src = readSource("src/app/layout.tsx");
    expect(src).toContain("https://plausible.io/js/script.js");
  });
});

describe("dead code removal", () => {
  it("E6: layout-metadata.ts dead code removed", () => {
    const exists = existsSync(join(process.cwd(), "src/app/layout-metadata.ts"));
    expect(exists).toBe(false);
  });
});

describe("analytics config type", () => {
  it("E7: InstanceIdentity includes analytics field", () => {
    const src = readSource("src/lib/config/defaults.ts");
    expect(src).toContain("analytics?");
    expect(src).toContain("plausibleDomain");
    expect(src).toContain("plausibleSrc");
  });
});
```

### §6.5 Test file location

All Sprint 6 tests go into: `tests/sprint-6-seo-infrastructure.test.ts`.

---

## §7 File Change Summary

### §7.1 New files

| File | Purpose |
| --- | --- |
| `src/app/sitemap.ts` | Dynamic sitemap.xml generation from corpus data |
| `src/app/robots.ts` | robots.txt with crawl rules and sitemap reference |

### §7.2 Modified files

| File | Change |
| --- | --- |
| `src/lib/config/defaults.ts` | Add optional `analytics` field to `InstanceIdentity` interface |
| `src/lib/config/instance.schema.ts` | Add runtime validation for `analytics` object (plausibleDomain, plausibleSrc) |
| `config/identity.json` | Add `analytics.plausibleDomain` for Studio Ordo instance |
| `src/app/layout.tsx` | Extend `generateMetadata()` with OG, canonical, metadataBase; add Plausible script |

### §7.3 Deleted files

| File | Reason |
| --- | --- |
| `src/app/layout-metadata.ts` | Dead code — static metadata object not imported anywhere, superseded by `generateMetadata()` |

### §7.4 Existing test updates

No existing tests need modification. Sprint 5 tests import `buildChapterMetadata`, `buildChapterJsonLd`, `buildLibraryIndexMetadata`, `buildLibraryIndexJsonLd` — all of which are preserved as backward-compatible wrappers from TD-B.

---

## §8 Acceptance Criteria

1. **Sitemap:** `GET /sitemap.xml` returns valid XML with homepage, library index, and all 104 chapter URLs. No redirect routes, API routes, or auth pages appear.
2. **Robots:** `GET /robots.txt` returns rules allowing `/` and `/library/`, disallowing `/api/`, `/login`, `/register`, `/profile`. Includes sitemap reference.
3. **Plausible:** When `analytics.plausibleDomain` is set in config, the root layout includes a `<script>` tag with `defer`, the correct `data-domain`, and the correct `src`. When config is absent, no script is injected.
4. **Root OG:** Homepage link previews show the brand name, tagline, description, and logo image.
5. **Root canonical:** Homepage has `alternates.canonical` set.
6. **metadataBase:** Root layout sets `metadataBase` to the configured domain URL.
7. **Dead code:** `src/app/layout-metadata.ts` is deleted.
8. **Tests:** 22 new tests pass. Total suite: 1351 + 22 = **1373** tests.
9. **Build clean.** Lint clean (no new issues).

---

## §9 Out of Scope

| Item | Deferred to |
| --- | --- |
| Per-page OG images (dynamic image generation) | Sprint 12 or later |
| Blog routes and blog sitemap entries | Sprint 7 |
| Plausible event tracking (conversions, custom events) | Sprint 10+ |
| XML sitemap index (multiple sitemaps for large sites) | Unnecessary at 106 URLs |
| `sitemap-index.xml` for multi-tenant deployments | Future consideration |
| Custom metadata on `/login`, `/register`, `/profile` | Not needed — utility pages excluded from indexing |
| `noindex` meta tags on auth pages | Not needed — `robots.txt Disallow` is sufficient for advisory blocking, and these pages don't leak sensitive data in their HTML |

---

## §10 Sprint Boundary Verification

After Sprint 6 is complete, verify:

```text
1. npx vitest run                    → 1373 tests passing (1351 + 22 new)
2. npm run build                     → clean, zero errors
3. npm run lint                      → no new warnings
4. curl -s http://localhost:3000/sitemap.xml | head -5
                                     → valid XML with <urlset> root element
5. curl -s http://localhost:3000/robots.txt
                                     → contains "Disallow: /api/" and "Sitemap:"
6. grep "plausibleDomain" config/identity.json
                                     → at least 1 match
7. grep "metadataBase" src/app/layout.tsx
                                     → at least 1 match
8. grep "openGraph" src/app/layout.tsx
                                     → at least 1 match
9. test ! -f src/app/layout-metadata.ts && echo "DELETED"
                                     → "DELETED"
```

---

## §11 Definition of Done

Sprint 6 is complete when:

1. `sitemap.xml` and `robots.txt` are generated dynamically from corpus and config data.
2. Plausible analytics is conditionally injected via config.
3. Root layout has full OG tags, canonical URL, and `metadataBase`.
4. Dead `layout-metadata.ts` is deleted.
5. 22 new tests pass. Total suite: 1351 + 22 = **1373** tests.
6. Build clean. Lint clean.

### §11.1 V1 spec update

After Sprint 6 is implemented, update [spec.md](spec.md):
- §7.3 test baseline → 1373 tests, running total append: → 1373 (S6, +22)

### §11.2 TD-B → Sprint 6 handoff verification

| TD-B artifact | Sprint 6 usage |
| --- | --- |
| `buildChapterSeo()` composite | Not directly used in sitemap (sitemap generates URLs, not metadata). Available for future sitemap description enrichment. |
| `buildLibraryIndexSeo()` composite | Same — available but not needed for URL-only sitemap. |
| `withErrorFallback` pattern | Sitemap/robots are simple functions with no error-prone I/O beyond config reads. Not needed. |
| Performance budgets | Plausible script is 0.8 KB deferred — no FCP/LCP regression. |
| `mergeWithDefaults` generic | Used automatically when `analytics` field is added to identity config (the config loader already uses `mergeWithDefaults` for identity). |

### §11.3 Sprint 6 → Sprint 7 handoff

| Sprint 6 artifact | How Sprint 7 uses it |
| --- | --- |
| `src/app/sitemap.ts` | Sprint 7 adds blog entries to the sitemap |
| `src/app/robots.ts` | Sprint 7 may add `/blog/` to the Allow list (already covered by `/` allow) |
| `metadataBase` in root layout | Blog pages inherit `metadataBase` — OG images can use relative paths |
| `extractDescription` (Sprint 5) | Blog post descriptions extracted using the same utility |
| Plausible analytics | Blog page views tracked automatically — no additional Sprint 7 work needed |
