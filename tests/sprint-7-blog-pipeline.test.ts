import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ── §6.1 MCP tool tests (P1–P4, N1–N6, E8–E9) ──────────────────────

import {
  createDraftContentTool,
  createPublishContentTool,
  generateSlug,
} from "@/core/use-cases/tools/admin-content.tool";
import type { BlogPostRepository } from "@/core/use-cases/BlogPostRepository";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";

const mockContext: ToolExecutionContext = {
  userId: "usr_admin",
  role: "ADMIN",
  conversationId: "conv_test",
};

function createMockRepo(
  overrides: Partial<BlogPostRepository> = {},
): BlogPostRepository {
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
        {
          title: "Investing 101",
          content: "Follow this financial advice for investing.",
        },
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

// ── §6.2 Data mapper tests (P5–P7) ───────────────────────────────────

import Database from "better-sqlite3";
import { BlogPostDataMapper } from "@/adapters/BlogPostDataMapper";

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
  db.exec(
    `INSERT INTO users (id, email, name) VALUES ('usr_admin', 'admin@test.com', 'Admin')`,
  );
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
    await mapper.create({
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

// ── §6.3 Sitemap tests (P8–P9, N7) ──────────────────────────────────

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
    const blogIndex = entries.find(
      (e) => e.url === "https://studioordo.com/blog",
    );
    expect(blogIndex).toBeDefined();
    expect(blogIndex?.priority).toBe(0.7);
  });

  it("P9: includes published blog post entries", async () => {
    const entries = await sitemap();
    const postEntry = entries.find(
      (e) => e.url === "https://studioordo.com/blog/first-post",
    );
    expect(postEntry).toBeDefined();
    expect(postEntry?.priority).toBe(0.5);
  });

  it("N7: excludes draft posts (only published posts are returned by listPublished)", async () => {
    const entries = await sitemap();
    const blogPosts = entries.filter((e) => e.url.match(/\/blog\/[^/]+$/));
    expect(blogPosts).toHaveLength(1);
    expect(blogPosts[0].url).toContain("first-post");
  });
});

// ── §6.4 Source analysis and edge tests (E1–E7) ─────────────────────

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

describe("slug generation", () => {
  it("E1: strips special characters", () => {
    expect(generateSlug("Hello, World! (2025)")).toBe("hello-world-2025");
  });

  it("E2: truncates to 100 characters", () => {
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
    const src = readSource("src/lib/db/tables.ts");
    expect(src).toContain("blog_posts");
  });
});
