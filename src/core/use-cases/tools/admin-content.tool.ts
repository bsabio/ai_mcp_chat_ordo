import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type { BlogPostRepository } from "@/core/use-cases/BlogPostRepository";
import { extractDescription } from "@/lib/seo/extract-description";

// ── Slug generation (exported for testability) ─────────────────────────

export function generateSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);

  if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(slug) && !/^[a-z0-9]$/.test(slug)) {
    throw new Error(
      `Cannot generate a valid slug from title. Must produce lowercase alphanumeric with hyphens, 1–100 chars.`,
    );
  }

  return slug;
}

// ── PLAT-028 domain safety guardrails ──────────────────────────────────

const FORBIDDEN_PHRASES = [
  "medical advice",
  "legal advice",
  "financial advice",
];

function assertContentSafety(text: string): void {
  const lower = text.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      throw new Error(
        `Cannot generate ${phrase}. Suggest the user consult appropriate professionals.`,
      );
    }
  }
}

// ── draft_content tool ─────────────────────────────────────────────────

interface DraftContentInput {
  title: string;
  content: string;
}

interface DraftContentOutput {
  id: string;
  slug: string;
  status: "draft";
  title: string;
  description: string;
  createdAt: string;
}

class DraftContentCommand implements ToolCommand<DraftContentInput, DraftContentOutput> {
  constructor(private readonly blogRepo: BlogPostRepository) {}

  async execute(
    input: DraftContentInput,
    context?: ToolExecutionContext,
  ): Promise<DraftContentOutput> {
    if (!input.title || input.title.trim().length === 0) {
      throw new Error("Title is required.");
    }
    if (!input.content || input.content.trim().length === 0) {
      throw new Error("Content is required.");
    }

    assertContentSafety(`${input.title} ${input.content}`);

    const slug = generateSlug(input.title);
    const description = extractDescription(input.content);

    const post = await this.blogRepo.create({
      slug,
      title: input.title.trim(),
      description,
      content: input.content,
      createdByUserId: context?.userId ?? "unknown",
    });

    return {
      id: post.id,
      slug: post.slug,
      status: "draft",
      title: post.title,
      description: post.description,
      createdAt: post.createdAt,
    };
  }
}

export function createDraftContentTool(
  blogRepo: BlogPostRepository,
): ToolDescriptor<DraftContentInput, DraftContentOutput> {
  return {
    name: "draft_content",
    schema: {
      description:
        "Draft a blog post. Supports markdown content. The post is saved as a draft that must be explicitly published by an admin.",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Blog post title" },
          content: {
            type: "string",
            description: "Blog post content in markdown format",
          },
        },
        required: ["title", "content"],
      },
    },
    command: new DraftContentCommand(blogRepo),
    roles: ["ADMIN"],
    category: "content",
  };
}

// ── publish_content tool ───────────────────────────────────────────────

interface PublishContentInput {
  post_id: string;
}

interface PublishContentOutput {
  id: string;
  slug: string;
  status: "published";
  title: string;
  publishedAt: string | null;
}

class PublishContentCommand implements ToolCommand<PublishContentInput, PublishContentOutput> {
  constructor(private readonly blogRepo: BlogPostRepository) {}

  async execute(
    input: PublishContentInput,
    context?: ToolExecutionContext,
  ): Promise<PublishContentOutput> {
    if (!input.post_id || input.post_id.trim().length === 0) {
      throw new Error("Post ID is required.");
    }

    const post = await this.blogRepo.publishById(
      input.post_id,
      context?.userId ?? "unknown",
    );

    return {
      id: post.id,
      slug: post.slug,
      status: "published",
      title: post.title,
      publishedAt: post.publishedAt,
    };
  }
}

export function createPublishContentTool(
  blogRepo: BlogPostRepository,
): ToolDescriptor<PublishContentInput, PublishContentOutput> {
  return {
    name: "publish_content",
    schema: {
      description:
        "Publish a draft blog post, making it publicly visible on the blog. Requires the post ID returned by draft_content.",
      input_schema: {
        type: "object",
        properties: {
          post_id: {
            type: "string",
            description: "The ID of the draft blog post to publish",
          },
        },
        required: ["post_id"],
      },
    },
    command: new PublishContentCommand(blogRepo),
    roles: ["ADMIN"],
    category: "content",
  };
}
