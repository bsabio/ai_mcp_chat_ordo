# V1 Sprint 7 — Blog and Content Pipeline

> **Parent spec:** [Platform V1](spec.md) §8 Phase C, Sprint 7
> **Requirement IDs:** PLAT-005 (content is public and indexable), PLAT-026 (public routes do not expose draft content), PLAT-028 (domain safety on AI-generated content)
> **Sprint 6 Baseline:** 1373 tests, 167 suites, build clean
> **Goal:** Add a blog subsystem — database-backed blog posts with draft/published workflow, two ADMIN-only MCP tools (`draft_content`, `publish_content`), public blog routes (`/blog`, `/blog/[slug]`), SEO metadata on blog pages, and sitemap extension for published posts. Content is created through the AI chat interface and reviewed by the admin before publishing.

---

## §1 Current State

### §1.1 What exists after Sprint 6

Sprint 6 completed the SEO infrastructure layer. The sitemap, robots.txt, Plausible analytics, and root layout OG tags are all in place. The `extractDescription` utility from Sprint 5 is available for reuse.

| Capability | File | Status |
| --- | --- | --- |
| Sitemap with corpus entries | `src/app/sitemap.ts` | **Full** — homepage, library index, 104 chapter URLs |
| robots.txt | `src/app/robots.ts` | **Full** — Allow `/`, Disallow `/api/`, `/login`, `/register`, `/profile` |
| Plausible analytics | `src/app/layout.tsx` | **Full** — config-driven script injection |
| Root layout OG/canonical/metadataBase | `src/app/layout.tsx` | **Full** — complete metadata with OG tags |
| Library SEO metadata | `src/lib/seo/library-metadata.ts` | **Full** — `buildChapterMetadata()`, `buildLibraryIndexMetadata()` |
| Description extraction | `src/lib/seo/extract-description.ts` | **Full** — reusable for blog post descriptions |
| MCP tool registry | `src/core/tool-registry/ToolRegistry.ts` | **Full** — RBAC-aware, middleware-composed |
| Tool composition root | `src/lib/chat/tool-composition-root.ts` | **Full** — 17 registered tools |
| Instance identity config | `config/identity.json` + `src/lib/config/instance.ts` | **Full** — domain, name, analytics |
| SQLite schema | `src/lib/db/schema.ts` | **Full** — 17 tables, no blog table |
| Data mapper pattern | `src/adapters/LeadRecordDataMapper.ts` et al. | **Full** — established pattern for new mappers |
| Role system | `src/core/entities/user.ts` | **Full** — ANONYMOUS, AUTHENTICATED, APPRENTICE, STAFF, ADMIN |

### §1.2 What does NOT exist yet

| Capability | V1 spec ref | Impact |
| --- | --- | --- |
| Blog posts database table | §8 Sprint 7 | No persistent storage for blog content. Cannot create, query, or publish posts. |
| Blog entity and repository | §8 Sprint 7 | No domain model for blog posts. No repository port or adapter. |
| Blog routes (`/blog`, `/blog/[slug]`) | §8 Sprint 7 | No public blog pages. Visitors cannot browse published content beyond the corpus library. |
| Admin content drafting MCP tool | §8 Sprint 7 | Admins cannot create blog content through the AI chat interface. |
| Admin content publishing MCP tool | §8 Sprint 7 | No mechanism to transition drafts to published status. |
| Blog entries in sitemap | §8 Sprint 7 | Published blog posts are invisible to search engine crawlers. |
| Blog page SEO metadata | PLAT-005 | No OG tags, canonical URLs, or JSON-LD for blog content. |

---

## §2 Design Decisions

### §2.1 Blog posts stored in SQLite, not the filesystem

The corpus library uses filesystem-based markdown files (`docs/_corpus/`). Blog posts take a different approach: they are stored in the `blog_posts` SQLite table. This is the correct choice because:

1. **Blog posts are user-generated at runtime** — an admin creates them through the AI chat interface. Filesystem writes from a running server are fragile (container restarts, permissions, concurrent access).
2. **Blog posts have workflow state** (draft → published). The database naturally supports status transitions, timestamps, and queries filtered by status.
3. **The Data Mapper pattern is already established** — `LeadRecordDataMapper`, `DealRecordDataMapper`, etc. Blog posts follow the same interface/adapter split.

### §2.2 Two separate MCP tools: `draft_content` and `publish_content`

The V1 spec calls for "Draft → review → publish workflow." This maps to two distinct MCP tools:

**`draft_content`** — Creates a blog post with `status = "draft"`. Accepts title and markdown content. Auto-generates a URL slug from the title and extracts a description from the content using the existing `extractDescription` utility.

**`publish_content`** — Transitions an existing draft to `status = "published"` and sets the `published_at` timestamp. Accepts the post ID returned by `draft_content`.

The "review" step is a human process: the admin reads the draft content in the chat response, edits if needed (by calling `draft_content` again or requesting revisions from the AI), and then calls `publish_content` when satisfied. No separate "review" status is needed in the database.

Both tools are `ADMIN`-only via the `roles` field on their `ToolDescriptor`.

### §2.3 Domain safety guardrails are hardcoded in the tool (PLAT-028)

The `draft_content` tool validates content against forbidden domains before persisting. This check is in the tool's `execute` method, not in config:

```
Forbidden phrases: "medical advice", "legal advice", "financial advice"
```

If the title or content contains any forbidden phrase, the tool throws an error instructing the user to consult appropriate professionals. This guardrail cannot be disabled by instance configuration — it is in the core, per PLAT-028.

### §2.4 Blog routes are public server components (PLAT-005)

Blog pages (`/blog` and `/blog/[slug]`) are server components with no authentication check, consistent with the library routes. Only posts with `status = "published"` are rendered. Draft posts return 404 via `notFound()` — they are never exposed to public visitors (PLAT-026).

### §2.5 Blog page SEO follows the Sprint 5/6 metadata pattern

Each blog route exports `generateMetadata()` producing:
- Page-specific `<title>`, `description`, canonical URL
- Open Graph tags (`og:title`, `og:description`, `og:url`, `og:type`, `og:image`)
- The blog post page uses `og:type = "article"` with `publishedTime`

Blog pages inherit `metadataBase` from the root layout (set in Sprint 6), so OG image paths work with relative URLs.

### §2.6 Sitemap extended with blog entries

`src/app/sitemap.ts` adds:
- A static `/blog` index entry with `priority: 0.7`
- A dynamic entry for each published post at `/blog/{slug}` with `priority: 0.5` and `lastModified` set to the post's `published_at` timestamp

Draft posts are excluded from the sitemap (PLAT-026).

### §2.7 Slug generation is automatic, deterministic, and safe

Slugs are generated from the title by: lowercasing, stripping characters that are not alphanumeric, underscores, hyphens, or spaces (`[^\w\s-]`), collapsing whitespace to single hyphens, collapsing consecutive hyphens, and truncating to 100 characters. The slug is validated with the same `assertValidSlug` pattern used by the librarian tool.

If a slug collision occurs (duplicate title), the `BlogPostDataMapper.create` method will throw a unique constraint violation from SQLite. The admin can retry with a different title.

### §2.8 Repository Factory extended for blog

`RepositoryFactory.ts` gains a `getBlogPostRepository()` function that returns a cached `BlogPostDataMapper` instance. This follows the existing singleton pattern used by `getCorpusRepository()`.

---

## §3 Implementation Plan

### Phase 1: Blog entity and repository port

**New file: `src/core/entities/blog.ts`**

```typescript
export type BlogPostStatus = "draft" | "published";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  status: BlogPostStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  publishedByUserId: string | null;
}

export interface BlogPostSeed {
  slug: string;
  title: string;
  description: string;
  content: string;
  createdByUserId: string;
}
```

**New file: `src/core/use-cases/BlogPostRepository.ts`**

```typescript
import type { BlogPost, BlogPostSeed } from "@/core/entities/blog";

export interface BlogPostRepository {
  create(seed: BlogPostSeed): Promise<BlogPost>;
  findById(id: string): Promise<BlogPost | null>;
  findBySlug(slug: string): Promise<BlogPost | null>;
  listPublished(): Promise<BlogPost[]>;
  publishById(id: string, publishedByUserId: string): Promise<BlogPost>;
}
```

### Phase 2: Database schema

**Modified file: `src/lib/db/schema.ts`**

Add the `blog_posts` table to `ensureSchema()`:

```sql
CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by_user_id TEXT NOT NULL,
  published_by_user_id TEXT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  FOREIGN KEY (published_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
```

### Phase 3: Data mapper

**New file: `src/adapters/BlogPostDataMapper.ts`**

Implements `BlogPostRepository`. Follows the same pattern as `LeadRecordDataMapper`:

1. Private `BlogPostRow` interface maps to DB columns (snake_case).
2. `mapRow(row): BlogPost` converts to domain entity (camelCase).
3. `create(seed)` generates a UUID, inserts with `status = "draft"`, returns the created entity.
4. `findById(id)` and `findBySlug(slug)` return `BlogPost | null`.
5. `listPublished()` returns posts where `status = 'published'` ordered by `published_at DESC`.
6. `publishById(id, userId)` sets `status = 'published'`, `published_at = datetime('now')`, `published_by_user_id = userId`. Throws if the post does not exist.

### Phase 4: Repository factory

**Modified file: `src/adapters/RepositoryFactory.ts`**

Add:

```typescript
import type { BlogPostRepository } from "@/core/use-cases/BlogPostRepository";
import { BlogPostDataMapper } from "./BlogPostDataMapper";
import { getDb } from "@/lib/db";

let blogRepo: BlogPostRepository | null = null;

export function getBlogPostRepository(): BlogPostRepository {
  if (!blogRepo) {
    blogRepo = new BlogPostDataMapper(getDb());
  }
  return blogRepo;
}
```

### Phase 5: MCP tools

**New file: `src/core/use-cases/tools/admin-content.tool.ts`**

Two tool factories in one file, plus an exported `generateSlug` utility function for testability:

**`createDraftContentTool(blogRepo)`** — Returns a `ToolDescriptor` with:
- `name: "draft_content"`
- `roles: ["ADMIN"]`
- `category: "content"`
- Command class `DraftContentCommand` that:
  1. Validates title and content are non-empty
  2. Checks content against PLAT-028 forbidden phrases
  3. Generates slug from title
  4. Calls `extractDescription(content)` for auto-description
  5. Calls `blogRepo.create(seed)` with `createdByUserId` from `context.userId`
  6. Returns the created post with its ID and slug

**`createPublishContentTool(blogRepo)`** — Returns a `ToolDescriptor` with:
- `name: "publish_content"`
- `roles: ["ADMIN"]`
- `category: "content"`
- Command class `PublishContentCommand` that:
  1. Validates post ID is non-empty
  2. Calls `blogRepo.publishById(id, context.userId)`
  3. Returns the published post with its slug and publishedAt timestamp

### Phase 6: Tool composition root

**Modified file: `src/lib/chat/tool-composition-root.ts`**

Add imports and registrations:

```typescript
import { createDraftContentTool, createPublishContentTool } from "@/core/use-cases/tools/admin-content.tool";
import { getBlogPostRepository } from "@/adapters/RepositoryFactory";

// Inside createToolRegistry():
const blogRepo = getBlogPostRepository();
reg.register(createDraftContentTool(blogRepo));
reg.register(createPublishContentTool(blogRepo));
```

### Phase 7: Blog routes

**New file: `src/app/blog/page.tsx`**

Blog index page (server component):
- Calls `getBlogPostRepository().listPublished()` to get published posts
- Renders a list of posts with title, description, date, and link to `/blog/{slug}`
- Exports `generateMetadata()` that returns blog index metadata with OG tags
- Uses `dynamic = "force-dynamic"` since posts can change at any time

**New file: `src/app/blog/[slug]/page.tsx`**

Blog post page (server component):
- Calls `getBlogPostRepository().findBySlug(params.slug)`
- If post is null or `status !== "published"`, calls `notFound()`
- Renders title, description, published date, and markdown content
- Exports `generateMetadata()` with post-specific OG tags, canonical URL, `og:type = "article"`, `publishedTime`

### Phase 8: Sitemap extension

**Modified file: `src/app/sitemap.ts`**

Add blog entries after the chapter entries:

```typescript
import { getBlogPostRepository } from "@/adapters/RepositoryFactory";

// Inside sitemap():
const blogRepo = getBlogPostRepository();
const publishedPosts = await blogRepo.listPublished();

const blogStaticEntries: MetadataRoute.Sitemap = [
  { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
];

const blogPostEntries: MetadataRoute.Sitemap = publishedPosts.map(post => ({
  url: `${base}/blog/${post.slug}`,
  lastModified: post.publishedAt ? new Date(post.publishedAt) : now,
  changeFrequency: "monthly" as const,
  priority: 0.5,
}));

return [...staticEntries, ...chapterEntries, ...blogStaticEntries, ...blogPostEntries];
```

---

## §4 Security Considerations

| Constraint | V1 spec ref | Implementation |
| --- | --- | --- |
| Draft content never exposed publicly | PLAT-026 | Blog routes filter by `status = "published"` in the repository query. The `[slug]` page calls `notFound()` for missing or draft posts. Sitemap only includes published posts. |
| Domain safety guardrails on AI-generated content | PLAT-028 | `DraftContentCommand.execute()` checks title + content for forbidden phrases ("medical advice", "legal advice", "financial advice"). Guardrails are hardcoded in core, not configurable. |
| Blog tools are ADMIN-only | RBAC | Both `draft_content` and `publish_content` descriptors set `roles: ["ADMIN"]`. The `RbacGuardMiddleware` enforces this at execution time. `getSchemasForRole()` excludes these tools from non-admin schema lists. |
| Slug is sanitized | Defense in depth | Slug generation strips all non-alphanumeric characters except hyphens. Input-derived slugs cannot contain path traversal sequences (`../`), HTML, or SQL injection payloads. The slug is further validated by a regex pattern before database insertion. |
| Canonical URLs use configured domain | Defense in depth | Same pattern as Sprint 5/6 — `identity.domain` from config, not from the request `Host` header. |
| Blog content is admin-authored | Trust boundary | Only ADMIN users can create content via the MCP tool. The `created_by_user_id` foreign key is set from `context.userId` (server-side), not from user input. |
| SQL parameters are bound, not interpolated | Defense in depth | `BlogPostDataMapper` uses better-sqlite3 prepared statements with `?` placeholders. No string interpolation in SQL. |

---

## §5 Test Specification

### §5.1 Positive tests (happy paths work)

| # | Test name | What it verifies |
| --- | --- | --- |
| P1 | `draft_content tool creates a draft blog post` | Call `DraftContentCommand.execute({ title: "Test Post", content: "Hello world." }, context)` → returns object with `id`, `slug: "test-post"`, `status: "draft"`, `title: "Test Post"`. |
| P2 | `draft_content auto-generates slug from title` | Call with `title: "My First Blog Post!"` → returned slug is `"my-first-blog-post"` (stripped punctuation, lowercased, hyphenated). |
| P3 | `draft_content auto-generates description from content when not provided` | Call with `content: "# Heading\n\nFirst paragraph of the post."` → returned post has a non-empty `description` matching `extractDescription` output. |
| P4 | `publish_content transitions draft to published` | Create a draft via `blogRepo.create(...)`, then call `PublishContentCommand.execute({ post_id: draft.id }, context)` → returned post has `status: "published"` and non-null `publishedAt`. |
| P5 | `BlogPostDataMapper.create persists and returns entity` | Call `create(seed)` → returned `BlogPost` has an `id`, `status: "draft"`, and matches the seed fields. A subsequent `findById` returns the same post. |
| P6 | `BlogPostDataMapper.listPublished returns only published posts` | Insert one draft and one published post → `listPublished()` returns only the published post. |
| P7 | `BlogPostDataMapper.findBySlug returns correct post` | Insert a post with `slug: "hello-world"` → `findBySlug("hello-world")` returns it. `findBySlug("nonexistent")` returns `null`. |
| P8 | `sitemap includes /blog index entry` | Call `sitemap()` → result contains an entry with URL ending in `/blog`. |
| P9 | `sitemap includes published blog post entries` | Insert a published post → call `sitemap()` → result contains an entry with URL matching `/blog/{slug}`. |

### §5.2 Negative tests (boundaries enforced)

| # | Test name | What it verifies |
| --- | --- | --- |
| N1 | `draft_content rejects content with medical advice` | Call with `content: "Take this medical advice seriously."` → throws error matching `/medical advice/i`. The blog repo `create` is never called. |
| N2 | `draft_content rejects content with legal advice` | Call with `content: "Here is legal advice for your case."` → throws error matching `/legal advice/i`. |
| N3 | `draft_content rejects empty title` | Call with `title: ""` → throws error. |
| N4 | `draft_content rejects empty content` | Call with `content: ""` → throws error. |
| N5 | `publish_content rejects non-existent post ID` | Call with `post_id: "nonexistent-id"` → throws error indicating the post was not found. |
| N6 | `draft_content rejects content with financial advice` | Call with `content: "Follow this financial advice for investing."` → throws error matching `/financial advice/i`. |
| N7 | `sitemap excludes draft blog posts` | Insert a draft post (not published) → call `sitemap()` → no entry with the draft's slug appears. |

### §5.3 Edge tests (boundary conditions and integration scenarios)

| # | Test name | What it verifies |
| --- | --- | --- |
| E1 | `slug generation strips special characters` | Generate slug from `"Hello, World! (2025)"` → result is `"hello-world-2025"`. |
| E2 | `slug generation truncates to 100 characters` | Generate slug from a 200-character title → result length ≤ 100. |
| E3 | `blog index page source exports generateMetadata` | Read `src/app/blog/page.tsx` source → contains `"generateMetadata"`. |
| E4 | `blog post page source exports generateMetadata` | Read `src/app/blog/[slug]/page.tsx` source → contains `"generateMetadata"`. |
| E5 | `blog post page source calls notFound for missing posts` | Read `src/app/blog/[slug]/page.tsx` source → contains `"notFound"`. |
| E6 | `blog pages have no auth imports` | Read source of both blog page files → neither imports `getSessionUser`, `getServerSession`, or any auth module. Confirms public access (PLAT-005). |
| E7 | `blog_posts table exists in schema` | Read `src/lib/db/schema.ts` source → contains `"blog_posts"`. |
| E8 | `draft_content tool descriptor has ADMIN-only roles` | Call `createDraftContentTool(mockRepo)` → descriptor has `roles: ["ADMIN"]` and `category: "content"`. |
| E9 | `publish_content tool descriptor has ADMIN-only roles` | Call `createPublishContentTool(mockRepo)` → descriptor has `roles: ["ADMIN"]` and `category: "content"`. |

### §5.4 Test count summary

| Category | Count |
| --- | --- |
| Positive (P1–P9) | 9 |
| Negative (N1–N7) | 7 |
| Edge (E1–E9) | 9 |
| **Total new tests** | **25** |
| Deleted tests | 0 |
| **Net change** | **+25** |

Note: The V1 spec §8 estimated +10 tests for Sprint 7. This spec expands to 25 because the sprint delivers five distinct subsystems (database schema, data mapper, two MCP tools, two blog routes, and sitemap extension) that each require positive, negative, and edge coverage. The MCP tools alone need 12 tests (P1–P4, N1–N6, E8–E9) to verify draft creation, publishing, safety guardrails, input validation, and role restrictions.

---

## §6 Test Implementation Patterns

### §6.1 MCP tool tests (P1–P4, N1–N6, E8–E9)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDraftContentTool, createPublishContentTool } from "@/core/use-cases/tools/admin-content.tool";
import type { BlogPostRepository } from "@/core/use-cases/BlogPostRepository";
import type { BlogPost } from "@/core/entities/blog";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";

const mockContext: ToolExecutionContext = {
  userId: "usr_admin",
  role: "ADMIN",
  conversationId: "conv_test",
};

function createMockRepo(overrides: Partial<BlogPostRepository> = {}): BlogPostRepository {
  return {
    create: vi.fn().mockImplementation((seed) =>
      Promise.resolve({
        id: "post_123",
        slug: seed.slug,
        title: seed.title,
        description: seed.description,
        content: seed.content,
        status: "draft" as const,
        publishedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdByUserId: seed.createdByUserId,
        publishedByUserId: null,
      }),
    ),
    findById: vi.fn().mockResolvedValue(null),
    findBySlug: vi.fn().mockResolvedValue(null),
    listPublished: vi.fn().mockResolvedValue([]),
    publishById: vi.fn().mockImplementation((id, userId) =>
      Promise.resolve({
        id,
        slug: "test-post",
        title: "Test Post",
        description: "Test",
        content: "Content",
        status: "published" as const,
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdByUserId: "usr_admin",
        publishedByUserId: userId,
      }),
    ),
    ...overrides,
  };
}

describe("draft_content tool", () => {
  it("P1: creates a draft blog post", async () => {
    const mockRepo = createMockRepo();
    const tool = createDraftContentTool(mockRepo);
    const result = await tool.command.execute(
      { title: "Test Post", content: "Hello world." },
      mockContext,
    );
    expect(result).toMatchObject({
      id: "post_123",
      slug: "test-post",
      status: "draft",
      title: "Test Post",
    });
    expect(mockRepo.create).toHaveBeenCalledOnce();
  });

  it("P2: auto-generates slug from title", async () => {
    const mockRepo = createMockRepo();
    const tool = createDraftContentTool(mockRepo);
    await tool.command.execute(
      { title: "My First Blog Post!", content: "Content here." },
      mockContext,
    );
    const seed = (mockRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(seed.slug).toBe("my-first-blog-post");
  });

  it("P3: auto-generates description from content", async () => {
    const mockRepo = createMockRepo();
    const tool = createDraftContentTool(mockRepo);
    await tool.command.execute(
      { title: "Test", content: "# Heading\n\nFirst paragraph of the post." },
      mockContext,
    );
    const seed = (mockRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(seed.description).toBe("First paragraph of the post.");
  });

  it("N1: rejects content with medical advice", async () => {
    const mockRepo = createMockRepo();
    const tool = createDraftContentTool(mockRepo);
    await expect(
      tool.command.execute(
        { title: "Health Tips", content: "Take this medical advice seriously." },
        mockContext,
      ),
    ).rejects.toThrow(/medical advice/i);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it("N2: rejects content with legal advice", async () => {
    const mockRepo = createMockRepo();
    const tool = createDraftContentTool(mockRepo);
    await expect(
      tool.command.execute(
        { title: "Legal Help", content: "Here is legal advice for your case." },
        mockContext,
      ),
    ).rejects.toThrow(/legal advice/i);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it("N6: rejects content with financial advice", async () => {
    const mockRepo = createMockRepo();
    const tool = createDraftContentTool(mockRepo);
    await expect(
      tool.command.execute(
        { title: "Investing 101", content: "Follow this financial advice for investing." },
        mockContext,
      ),
    ).rejects.toThrow(/financial advice/i);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it("N3: rejects empty title", async () => {
    const mockRepo = createMockRepo();
    const tool = createDraftContentTool(mockRepo);
    await expect(
      tool.command.execute({ title: "", content: "Some content." }, mockContext),
    ).rejects.toThrow();
  });

  it("N4: rejects empty content", async () => {
    const mockRepo = createMockRepo();
    const tool = createDraftContentTool(mockRepo);
    await expect(
      tool.command.execute({ title: "Valid Title", content: "" }, mockContext),
    ).rejects.toThrow();
  });

  it("E8: tool descriptor has ADMIN-only roles", () => {
    const mockRepo = createMockRepo();
    const tool = createDraftContentTool(mockRepo);
    expect(tool.roles).toEqual(["ADMIN"]);
    expect(tool.category).toBe("content");
    expect(tool.name).toBe("draft_content");
  });
});

describe("publish_content tool", () => {
  it("P4: transitions draft to published", async () => {
    const mockRepo = createMockRepo();
    const tool = createPublishContentTool(mockRepo);
    const result = await tool.command.execute(
      { post_id: "post_123" },
      mockContext,
    );
    expect(result).toMatchObject({
      status: "published",
    });
    expect(result.publishedAt).toBeTruthy();
    expect(mockRepo.publishById).toHaveBeenCalledWith("post_123", "usr_admin");
  });

  it("N5: rejects non-existent post ID", async () => {
    const mockRepo = createMockRepo({
      publishById: vi.fn().mockRejectedValue(new Error("Post not found")),
    });
    const tool = createPublishContentTool(mockRepo);
    await expect(
      tool.command.execute({ post_id: "nonexistent-id" }, mockContext),
    ).rejects.toThrow(/not found/i);
  });

  it("E9: tool descriptor has ADMIN-only roles", () => {
    const mockRepo = createMockRepo();
    const tool = createPublishContentTool(mockRepo);
    expect(tool.roles).toEqual(["ADMIN"]);
    expect(tool.category).toBe("content");
    expect(tool.name).toBe("publish_content");
  });
});
```

### §6.2 Data mapper tests (P5–P7)

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { BlogPostDataMapper } from "@/adapters/BlogPostDataMapper";

// Use in-memory SQLite for isolation
function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, name TEXT);
    CREATE TABLE blog_posts (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by_user_id TEXT NOT NULL,
      published_by_user_id TEXT
    );
  `);
  db.exec(`INSERT INTO users (id, email, name) VALUES ('usr_admin', 'admin@test.com', 'Admin')`);
  return db;
}

describe("BlogPostDataMapper", () => {
  let db: Database.Database;
  let mapper: BlogPostDataMapper;

  beforeEach(() => {
    db = createTestDb();
    mapper = new BlogPostDataMapper(db);
  });

  it("P5: create persists and returns entity", async () => {
    const post = await mapper.create({
      slug: "hello-world",
      title: "Hello World",
      description: "A first post",
      content: "# Hello\n\nWorld.",
      createdByUserId: "usr_admin",
    });
    expect(post.id).toBeTruthy();
    expect(post.status).toBe("draft");
    expect(post.slug).toBe("hello-world");
    expect(post.title).toBe("Hello World");

    const found = await mapper.findById(post.id);
    expect(found).toMatchObject({ id: post.id, slug: "hello-world" });
  });

  it("P6: listPublished returns only published posts", async () => {
    const draft = await mapper.create({
      slug: "draft-post",
      title: "Draft Post",
      description: "Draft",
      content: "Draft content.",
      createdByUserId: "usr_admin",
    });
    const toPublish = await mapper.create({
      slug: "published-post",
      title: "Published Post",
      description: "Published",
      content: "Published content.",
      createdByUserId: "usr_admin",
    });
    await mapper.publishById(toPublish.id, "usr_admin");

    const published = await mapper.listPublished();
    expect(published).toHaveLength(1);
    expect(published[0].slug).toBe("published-post");
    expect(published[0].status).toBe("published");
  });

  it("P7: findBySlug returns correct post or null", async () => {
    await mapper.create({
      slug: "hello-world",
      title: "Hello World",
      description: "A post",
      content: "Content.",
      createdByUserId: "usr_admin",
    });

    const found = await mapper.findBySlug("hello-world");
    expect(found).toBeTruthy();
    expect(found!.title).toBe("Hello World");

    const notFound = await mapper.findBySlug("nonexistent");
    expect(notFound).toBeNull();
  });
});
```

### §6.3 Sitemap tests (P8–P9, N7)

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
  getCorpusSummaries: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getBlogPostRepository: () => ({
    listPublished: vi.fn().mockResolvedValue([
      {
        id: "post_1",
        slug: "first-post",
        title: "First Post",
        description: "The first post",
        content: "Content",
        status: "published",
        publishedAt: "2025-01-15T00:00:00.000Z",
        createdAt: "2025-01-15T00:00:00.000Z",
        updatedAt: "2025-01-15T00:00:00.000Z",
        createdByUserId: "usr_admin",
        publishedByUserId: "usr_admin",
      },
    ]),
  }),
}));

import sitemap from "@/app/sitemap";

describe("sitemap blog entries", () => {
  it("P8: includes /blog index entry", async () => {
    const entries = await sitemap();
    const blogIndex = entries.find((e) => e.url === "https://studioordo.com/blog");
    expect(blogIndex).toBeDefined();
    expect(blogIndex?.priority).toBe(0.7);
  });

  it("P9: includes published blog post entries", async () => {
    const entries = await sitemap();
    const postEntry = entries.find((e) =>
      e.url === "https://studioordo.com/blog/first-post",
    );
    expect(postEntry).toBeDefined();
    expect(postEntry?.priority).toBe(0.5);
  });

  it("N7: excludes draft posts (only published posts are returned by listPublished)", async () => {
    // listPublished mock above only returns published posts by definition
    // This test verifies the sitemap only includes entries from listPublished
    const entries = await sitemap();
    const blogPosts = entries.filter((e) =>
      e.url.match(/\/blog\/[^/]+$/),
    );
    // Only 1 published post in mock
    expect(blogPosts).toHaveLength(1);
    expect(blogPosts[0].url).toContain("first-post");
  });
});
```

### §6.4 Source analysis and edge tests (E1–E7)

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

describe("slug generation", () => {
  it("E1: strips special characters", () => {
    // Import the exported slug generator from the tool module
    // generateSlug is exported from admin-content.tool.ts for testability
    const { generateSlug } = require("@/core/use-cases/tools/admin-content.tool");
    expect(generateSlug("Hello, World! (2025)")).toBe("hello-world-2025");
  });

  it("E2: truncates to 100 characters", () => {
    const { generateSlug } = require("@/core/use-cases/tools/admin-content.tool");
    const slug = generateSlug("a".repeat(200));
    expect(slug.length).toBeLessThanOrEqual(100);
  });
});

describe("blog page source analysis", () => {
  it("E3: blog index page exports generateMetadata", () => {
    const src = readSource("src/app/blog/page.tsx");
    expect(src).toContain("generateMetadata");
  });

  it("E4: blog post page exports generateMetadata", () => {
    const src = readSource("src/app/blog/[slug]/page.tsx");
    expect(src).toContain("generateMetadata");
  });

  it("E5: blog post page calls notFound for missing posts", () => {
    const src = readSource("src/app/blog/[slug]/page.tsx");
    expect(src).toContain("notFound");
  });

  it("E6: blog pages have no auth imports", () => {
    const indexSrc = readSource("src/app/blog/page.tsx");
    const postSrc = readSource("src/app/blog/[slug]/page.tsx");
    for (const src of [indexSrc, postSrc]) {
      expect(src).not.toContain("getSessionUser");
      expect(src).not.toContain("getServerSession");
    }
  });
});

describe("blog schema", () => {
  it("E7: blog_posts table exists in schema", () => {
    const src = readSource("src/lib/db/schema.ts");
    expect(src).toContain("blog_posts");
  });
});
```

### §6.5 Test file location

All Sprint 7 tests go into: `tests/sprint-7-blog-pipeline.test.ts`.

---

## §7 File Change Summary

### §7.1 New files

| File | Purpose |
| --- | --- |
| `src/core/entities/blog.ts` | `BlogPost` entity, `BlogPostStatus` type, `BlogPostSeed` interface |
| `src/core/use-cases/BlogPostRepository.ts` | Repository port interface for blog post persistence |
| `src/adapters/BlogPostDataMapper.ts` | SQLite-backed implementation of `BlogPostRepository` |
| `src/core/use-cases/tools/admin-content.tool.ts` | `draft_content` and `publish_content` MCP tool descriptors |
| `src/app/blog/page.tsx` | Blog index page (public, server component) |
| `src/app/blog/[slug]/page.tsx` | Blog post page (public, server component) |
| `tests/sprint-7-blog-pipeline.test.ts` | Sprint 7 verification tests (25 tests) |

### §7.2 Modified files

| File | Change |
| --- | --- |
| `src/lib/db/schema.ts` | Add `blog_posts` table with `CREATE TABLE IF NOT EXISTS` and indexes |
| `src/adapters/RepositoryFactory.ts` | Add `getBlogPostRepository()` singleton factory |
| `src/lib/chat/tool-composition-root.ts` | Import and register `draft_content` and `publish_content` tools |
| `src/app/sitemap.ts` | Add `/blog` static entry and dynamic published post entries |

### §7.3 Existing test updates

Two existing tests require a tool-count bump from 17 → 19:

| File | Change |
| --- | --- |
| `tests/core-policy.test.ts` | ADMIN schema count 17 → 19, description "13 base + 6 admin-only tools", add `draft_content` / `publish_content` name assertions |
| `tests/tool-registry.integration.test.ts` | Registry tool count 17 → 19 |

The sitemap tests from Sprint 6 still pass because the blog repository mock returns an empty list by default when not explicitly mocked.

---

## §8 Acceptance Criteria

1. **Database:** `blog_posts` table is created by `ensureSchema()` with columns for id, slug, title, description, content, status, published_at, created_at, updated_at, created_by_user_id, published_by_user_id.
2. **Entity:** `BlogPost` interface and `BlogPostSeed` type are defined in `src/core/entities/blog.ts`.
3. **Repository:** `BlogPostRepository` interface defines `create`, `findById`, `findBySlug`, `listPublished`, `publishById`. `BlogPostDataMapper` implements it.
4. **Draft tool:** `draft_content` MCP tool creates a blog post with status "draft". It auto-generates slug and description. It rejects forbidden content per PLAT-028. It is ADMIN-only.
5. **Publish tool:** `publish_content` MCP tool transitions a draft to published with a timestamp. It is ADMIN-only.
6. **Blog index:** `GET /blog` renders published posts. Has `generateMetadata()` with OG tags.
7. **Blog post:** `GET /blog/{slug}` renders a published post. Returns 404 for drafts and non-existent slugs. Has `generateMetadata()` with article OG tags and canonical URL.
8. **Sitemap:** `/blog` added as static entry (priority 0.7). Published posts added as dynamic entries (priority 0.5). Drafts excluded.
9. **Public access:** Blog pages have no auth checks (PLAT-005). Only published content is visible (PLAT-026).
10. **Tests:** 25 new tests pass. Total suite: 1373 + 25 = **1398** tests.
11. **Build clean.** Lint clean (no new issues).

---

## §9 Out of Scope

| Item | Deferred to |
| --- | --- |
| Blog post editing/updating via MCP tool | Future sprint — admins can recreate posts with revised content |
| Blog post deletion | Future sprint — soft delete or archive functionality |
| Blog categories/tags | Sprint 10+ — taxonomy and filtering |
| Blog search | Sprint 10+ — BM25/vector search over blog content |
| Blog RSS/Atom feed | Sprint 10+ — syndication |
| Blog comments | Not planned — chat-first engagement model |
| Rich media in blog posts (images, embeds) | Future sprint — markdown-only for Sprint 7 |
| Blog admin UI (non-chat) | Future sprint — all admin actions through chat for Sprint 7 |
| Per-post OG images | Sprint 12 — dynamic OG image generation |
| Blog content import from external sources | Future consideration |
| `review` status as a distinct database state | Not needed — review is a human process in chat, not a persisted status |

---

## §10 Sprint Boundary Verification

After Sprint 7 is complete, verify:

```text
1. npx vitest run                    → 1398 tests passing (1373 + 25 new)
2. npm run build                     → clean, zero errors
3. npm run lint                      → no new warnings
4. grep "blog_posts" src/lib/db/schema.ts
                                     → at least 1 match
5. grep "draft_content" src/core/use-cases/tools/admin-content.tool.ts
                                     → at least 1 match
6. grep "publish_content" src/core/use-cases/tools/admin-content.tool.ts
                                     → at least 1 match
7. grep "generateMetadata" src/app/blog/page.tsx
                                     → at least 1 match
8. grep "generateMetadata" src/app/blog/\[slug\]/page.tsx
                                     → at least 1 match
9. grep "notFound" src/app/blog/\[slug\]/page.tsx
                                     → at least 1 match
10. grep "/blog" src/app/sitemap.ts
                                     → at least 1 match
```

---

## §11 Definition of Done

Sprint 7 is complete when:

1. Blog posts can be created via the `draft_content` MCP tool and published via the `publish_content` MCP tool — both ADMIN-only.
2. Published posts are publicly accessible at `/blog` and `/blog/{slug}` with full SEO metadata.
3. Draft posts are never exposed in public routes or sitemap (PLAT-026).
4. AI-generated content is validated against PLAT-028 domain safety guardrails.
5. Published posts appear in `sitemap.xml`.
6. 25 new tests pass. Total suite: 1373 + 25 = **1398** tests.
7. Build clean. Lint clean.

### §11.1 V1 spec update

After Sprint 7 is implemented, update [spec.md](spec.md):
- §7.3 test baseline → 1398 tests, running total append: → 1398 (S7, +25)

### §11.2 Sprint 6 → Sprint 7 handoff verification

| Sprint 6 artifact | Sprint 7 usage |
| --- | --- |
| `src/app/sitemap.ts` | Extended with `/blog` index entry and published post entries |
| `src/app/robots.ts` | No change needed — `/blog/` is already covered by the Allow `/` rule |
| `metadataBase` in root layout | Blog pages inherit `metadataBase` — OG images use relative paths |
| `extractDescription` (Sprint 5) | Used by `DraftContentCommand` to auto-generate post descriptions |
| Plausible analytics | Blog page views tracked automatically — no Sprint 7 work needed |
| Data mapper pattern (`LeadRecordDataMapper` et al.) | Same pattern used for `BlogPostDataMapper` |
| Tool composition root | Extended with `draft_content` and `publish_content` tool registrations |
| RBAC middleware | Enforces ADMIN-only access on both blog tools — no new middleware needed |

### §11.3 Sprint 7 → TD-C handoff

Sprint 7 is the last feature sprint before TD-C (Martin SOLID Audit). TD-C will audit:

| Sprint 7 artifact | TD-C audit focus |
| --- | --- |
| `admin-content.tool.ts` | Single Responsibility — does the tool command do too much? (validation + slug generation + persistence) |
| `BlogPostDataMapper` | Dependency Inversion — does the data mapper depend on abstractions, not concretions? |
| `RepositoryFactory` | Open/Closed — can new repos be added without modifying existing factory code? |
| Blog routes | Interface Segregation — do routes depend on the minimal repository interface they need? |
| `tool-composition-root.ts` | Open/Closed — is tool registration extensible without modifying the composition root? |
