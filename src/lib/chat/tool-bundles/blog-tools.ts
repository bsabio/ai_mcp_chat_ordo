import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { projectCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-binding";
import {
  getBlogAssetRepository,
  getBlogPostRepository,
  getBlogPostRevisionRepository,
  getJournalEditorialMutationRepository,
  getJobStatusQuery,
} from "@/adapters/RepositoryFactory";
import {
  getBlogArticleProductionService,
  getBlogImageGenerationService,
} from "@/lib/blog/blog-production-root";
import { JournalEditorialInteractor } from "@/core/use-cases/JournalEditorialInteractor";
import {
  createRegisteredToolBundle,
  registerToolBundle,
  type ToolBundleRegistration,
} from "./bundle-registration";

interface BlogToolRegistrationDeps {
  readonly blogRepo: ReturnType<typeof getBlogPostRepository>;
  readonly blogAssetRepo: ReturnType<typeof getBlogAssetRepository>;
  readonly blogRevisionRepo: ReturnType<typeof getBlogPostRevisionRepository>;
  readonly blogArticleService: ReturnType<typeof getBlogArticleProductionService>;
  readonly blogImageService: ReturnType<typeof getBlogImageGenerationService>;
  readonly jobStatusQuery: ReturnType<typeof getJobStatusQuery>;
  readonly journalEditorialInteractor: JournalEditorialInteractor;
}

type BlogToolName =
  | "approve_journal_post"
  | "compose_blog_article"
  | "draft_content"
  | "generate_blog_image"
  | "generate_blog_image_prompt"
  | "get_journal_post"
  | "get_journal_workflow_summary"
  | "list_journal_posts"
  | "list_journal_revisions"
  | "prepare_journal_post_for_publish"
  | "produce_blog_article"
  | "publish_content"
  | "publish_journal_post"
  | "qa_blog_article"
  | "resolve_blog_article_qa"
  | "restore_journal_revision"
  | "select_journal_hero_image"
  | "submit_journal_review"
  | "update_journal_draft"
  | "update_journal_metadata";

const BLOG_TOOL_REGISTRATIONS = [
  {
    toolName: "approve_journal_post",
    createTool: ({ journalEditorialInteractor }) =>
      projectCatalogBoundToolDescriptor("approve_journal_post", { journalEditorialInteractor }),
  },
  {
    toolName: "compose_blog_article",
    createTool: ({ blogArticleService }) =>
      projectCatalogBoundToolDescriptor("compose_blog_article", { blogArticleService }),
  },
  {
    toolName: "draft_content",
    createTool: ({ blogRepo, blogAssetRepo }) =>
      projectCatalogBoundToolDescriptor("draft_content", {
        blogRepo,
        blogAssetRepo,
      }),
  },
  {
    toolName: "generate_blog_image",
    createTool: ({ blogImageService }) =>
      projectCatalogBoundToolDescriptor("generate_blog_image", { blogImageService }),
  },
  {
    toolName: "generate_blog_image_prompt",
    createTool: ({ blogArticleService }) =>
      projectCatalogBoundToolDescriptor("generate_blog_image_prompt", { blogArticleService }),
  },
  {
    toolName: "get_journal_post",
    createTool: ({ blogRepo }) => projectCatalogBoundToolDescriptor("get_journal_post", { blogRepo }),
  },
  {
    toolName: "get_journal_workflow_summary",
    createTool: ({ blogRepo, jobStatusQuery }) =>
      projectCatalogBoundToolDescriptor("get_journal_workflow_summary", { blogRepo, jobStatusQuery }),
  },
  {
    toolName: "list_journal_posts",
    createTool: ({ blogRepo }) => projectCatalogBoundToolDescriptor("list_journal_posts", { blogRepo }),
  },
  {
    toolName: "list_journal_revisions",
    createTool: ({ blogRepo, blogRevisionRepo }) =>
      projectCatalogBoundToolDescriptor("list_journal_revisions", { blogRepo, blogRevisionRepo }),
  },
  {
    toolName: "prepare_journal_post_for_publish",
    createTool: ({ blogRepo, blogRevisionRepo, jobStatusQuery, blogArticleService }) =>
      projectCatalogBoundToolDescriptor("prepare_journal_post_for_publish", {
        blogRepo,
        blogRevisionRepo,
        jobStatusQuery,
        blogArticleService,
      }),
  },
  {
    toolName: "produce_blog_article",
    createTool: ({ blogArticleService }) =>
      projectCatalogBoundToolDescriptor("produce_blog_article", { blogArticleService }),
  },
  {
    toolName: "publish_content",
    createTool: ({ blogRepo, blogAssetRepo }) =>
      projectCatalogBoundToolDescriptor("publish_content", {
        blogRepo,
        blogAssetRepo,
      }),
  },
  {
    toolName: "publish_journal_post",
    createTool: ({ blogRepo, blogRevisionRepo, blogAssetRepo }) =>
      projectCatalogBoundToolDescriptor("publish_journal_post", {
        blogRepo,
        blogRevisionRepo,
        blogAssetRepo,
      }),
  },
  {
    toolName: "qa_blog_article",
    createTool: ({ blogArticleService }) =>
      projectCatalogBoundToolDescriptor("qa_blog_article", { blogArticleService }),
  },
  {
    toolName: "resolve_blog_article_qa",
    createTool: ({ blogArticleService }) =>
      projectCatalogBoundToolDescriptor("resolve_blog_article_qa", { blogArticleService }),
  },
  {
    toolName: "restore_journal_revision",
    createTool: ({ journalEditorialInteractor }) =>
      projectCatalogBoundToolDescriptor("restore_journal_revision", { journalEditorialInteractor }),
  },
  {
    toolName: "select_journal_hero_image",
    createTool: ({ blogImageService }) =>
      projectCatalogBoundToolDescriptor("select_journal_hero_image", { blogImageService }),
  },
  {
    toolName: "submit_journal_review",
    createTool: ({ journalEditorialInteractor }) =>
      projectCatalogBoundToolDescriptor("submit_journal_review", { journalEditorialInteractor }),
  },
  {
    toolName: "update_journal_draft",
    createTool: ({ journalEditorialInteractor }) =>
      projectCatalogBoundToolDescriptor("update_journal_draft", { journalEditorialInteractor }),
  },
  {
    toolName: "update_journal_metadata",
    createTool: ({ journalEditorialInteractor }) =>
      projectCatalogBoundToolDescriptor("update_journal_metadata", { journalEditorialInteractor }),
  },
] as const satisfies readonly ToolBundleRegistration<BlogToolName, BlogToolRegistrationDeps>[];

export const BLOG_BUNDLE = createRegisteredToolBundle(
  "blog",
  "Blog Tools",
  BLOG_TOOL_REGISTRATIONS,
);

export function registerBlogTools(registry: ToolRegistry): void {
  const blogRepo = getBlogPostRepository();
  const blogAssetRepo = getBlogAssetRepository();
  const blogRevisionRepo = getBlogPostRevisionRepository();
  const blogArticleService = getBlogArticleProductionService();
  const blogImageService = getBlogImageGenerationService();
  const jobStatusQuery = getJobStatusQuery();
  const journalEditorialInteractor = new JournalEditorialInteractor(
    blogRepo,
    blogRevisionRepo,
    getJournalEditorialMutationRepository(),
  );

  registerToolBundle(registry, BLOG_TOOL_REGISTRATIONS, {
    blogRepo,
    blogAssetRepo,
    blogRevisionRepo,
    blogArticleService,
    blogImageService,
    jobStatusQuery,
    journalEditorialInteractor,
  });
}
