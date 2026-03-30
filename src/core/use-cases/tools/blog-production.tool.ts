import type {
  BlogQaReport,
  ComposeBlogArticleInput,
  ComposedBlogArticle,
} from "@/core/use-cases/BlogArticlePipelineModel";
import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type {
  BlogArticleProductionService,
  ProduceBlogArticleInput,
  ProduceBlogArticleOutput,
} from "@/lib/blog/blog-article-production-service";

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function parseArticle(value: Record<string, unknown>): ComposedBlogArticle {
  return {
    title: requireNonEmptyString(value.title, "Title"),
    description: requireNonEmptyString(value.description, "Description"),
    content: requireNonEmptyString(value.content, "Content"),
  };
}

function parseQaReport(value: unknown): BlogQaReport {
  if (typeof value !== "object" || value === null) {
    throw new Error("QA report is required.");
  }

  const report = value as Record<string, unknown>;
  return {
    approved: Boolean(report.approved),
    summary: requireNonEmptyString(report.summary, "QA summary"),
    findings: Array.isArray(report.findings)
      ? report.findings.map((finding, index) => {
        const row = finding as Record<string, unknown>;
        return {
          id: requireNonEmptyString(row.id ?? `finding_${index + 1}`, "Finding id"),
          severity: requireNonEmptyString(row.severity, "Finding severity") as "low" | "medium" | "high",
          issue: requireNonEmptyString(row.issue, "Finding issue"),
          recommendation: requireNonEmptyString(row.recommendation, "Finding recommendation"),
        };
      })
      : [],
  };
}

export interface QaBlogArticleInput {
  post_id?: string;
  title: string;
  description: string;
  content: string;
}

export interface ResolveBlogArticleQaInput extends QaBlogArticleInput {
  qa_report: BlogQaReport;
}

export type GenerateBlogImagePromptInput = QaBlogArticleInput;

export function parseComposeBlogArticleInput(value: Record<string, unknown>): ComposeBlogArticleInput {
  return {
    brief: requireNonEmptyString(value.brief, "Brief"),
    audience: typeof value.audience === "string" ? value.audience.trim() : undefined,
    objective: typeof value.objective === "string" ? value.objective.trim() : undefined,
    tone: typeof value.tone === "string" ? value.tone.trim() : undefined,
  };
}

export function parseQaBlogArticleInput(value: Record<string, unknown>): QaBlogArticleInput {
  return {
    post_id: typeof value.post_id === "string" ? value.post_id : undefined,
    ...parseArticle(value),
  };
}

export function parseResolveBlogArticleQaInput(
  value: Record<string, unknown>,
): ResolveBlogArticleQaInput {
  return {
    post_id: typeof value.post_id === "string" ? value.post_id : undefined,
    ...parseArticle(value),
    qa_report: parseQaReport(value.qa_report),
  };
}

export function parseGenerateBlogImagePromptInput(
  value: Record<string, unknown>,
): GenerateBlogImagePromptInput {
  return parseArticle(value);
}

export function parseProduceBlogArticleInput(
  value: Record<string, unknown>,
): ProduceBlogArticleInput {
  const base = parseComposeBlogArticleInput(value);
  return {
    ...base,
    enhanceImagePrompt:
      typeof value.enhance_image_prompt === "boolean"
        ? value.enhance_image_prompt
        : undefined,
  };
}

export async function executeComposeBlogArticle(
  service: BlogArticleProductionService,
  input: ComposeBlogArticleInput,
): Promise<ComposedBlogArticle & { summary: string }> {
  const article = await service.composeArticle(input);
  return {
    ...article,
    summary: `Composed article draft "${article.title}".`,
  };
}

export async function executeQaBlogArticle(
  service: BlogArticleProductionService,
  input: QaBlogArticleInput,
  context?: ToolExecutionContext,
): Promise<BlogQaReport & { summary: string }> {
  const report = input.post_id
    ? await service.reviewArticleForPost(
      input.post_id,
      input,
      requireExecutionContextUserId(context, "post_id"),
    )
    : await service.reviewArticle(input);
  return {
    ...report,
    summary: report.summary,
  };
}

export async function executeResolveBlogArticleQa(
  service: BlogArticleProductionService,
  input: ResolveBlogArticleQaInput,
  context?: ToolExecutionContext,
): Promise<Awaited<ReturnType<BlogArticleProductionService["resolveQa"]>> & { summary: string }> {
  const resolved = input.post_id
    ? await service.resolveQaForPost(
      input.post_id,
      input,
      input.qa_report,
      requireExecutionContextUserId(context, "post_id"),
    )
    : await service.resolveQa(input, input.qa_report);
  return {
    ...resolved,
    summary: resolved.resolutionSummary,
  };
}

export async function executeGenerateBlogImagePrompt(
  service: BlogArticleProductionService,
  input: GenerateBlogImagePromptInput,
): Promise<Awaited<ReturnType<BlogArticleProductionService["designHeroImagePrompt"]>> & { summary: string }> {
  const prompt = await service.designHeroImagePrompt(input);
  return {
    ...prompt,
    summary: prompt.summary,
  };
}

export async function executeProduceBlogArticle(
  service: BlogArticleProductionService,
  input: ProduceBlogArticleInput,
  context: ToolExecutionContext,
  reportProgress?: (label: string, percent: number) => Promise<void>,
): Promise<ProduceBlogArticleOutput> {
  return service.produceArticle(input, context, reportProgress);
}

class ComposeBlogArticleCommand implements ToolCommand<ComposeBlogArticleInput, Awaited<ReturnType<typeof executeComposeBlogArticle>>> {
  constructor(private readonly service: BlogArticleProductionService) {}

  async execute(input: ComposeBlogArticleInput): Promise<Awaited<ReturnType<typeof executeComposeBlogArticle>>> {
    return executeComposeBlogArticle(this.service, input);
  }
}

class QaBlogArticleCommand implements ToolCommand<QaBlogArticleInput, Awaited<ReturnType<typeof executeQaBlogArticle>>> {
  constructor(private readonly service: BlogArticleProductionService) {}

  async execute(
    input: QaBlogArticleInput,
    context?: ToolExecutionContext,
  ): Promise<Awaited<ReturnType<typeof executeQaBlogArticle>>> {
    return executeQaBlogArticle(this.service, input, context);
  }
}

class ResolveBlogArticleQaCommand implements ToolCommand<ResolveBlogArticleQaInput, Awaited<ReturnType<typeof executeResolveBlogArticleQa>>> {
  constructor(private readonly service: BlogArticleProductionService) {}

  async execute(
    input: ResolveBlogArticleQaInput,
    context?: ToolExecutionContext,
  ): Promise<Awaited<ReturnType<typeof executeResolveBlogArticleQa>>> {
    return executeResolveBlogArticleQa(this.service, input, context);
  }
}

function requireExecutionContextUserId(
  context: ToolExecutionContext | undefined,
  fieldName: string,
): string {
  if (!context?.userId) {
    throw new Error(`Tool execution context is required when ${fieldName} is provided.`);
  }

  return context.userId;
}

class GenerateBlogImagePromptCommand implements ToolCommand<GenerateBlogImagePromptInput, Awaited<ReturnType<typeof executeGenerateBlogImagePrompt>>> {
  constructor(private readonly service: BlogArticleProductionService) {}

  async execute(
    input: GenerateBlogImagePromptInput,
  ): Promise<Awaited<ReturnType<typeof executeGenerateBlogImagePrompt>>> {
    return executeGenerateBlogImagePrompt(this.service, input);
  }
}

class ProduceBlogArticleCommand implements ToolCommand<ProduceBlogArticleInput, ProduceBlogArticleOutput> {
  constructor(private readonly service: BlogArticleProductionService) {}

  async execute(
    input: ProduceBlogArticleInput,
    context?: ToolExecutionContext,
  ): Promise<ProduceBlogArticleOutput> {
    if (!context) {
      throw new Error("Tool execution context is required.");
    }

    return executeProduceBlogArticle(this.service, input, context);
  }
}

function deferredAdminTool<TInput, TOutput>(
  name: string,
  description: string,
  inputSchema: Record<string, unknown>,
  command: ToolCommand<TInput, TOutput>,
): ToolDescriptor<TInput, TOutput> {
  return {
    name,
    schema: {
      description,
      input_schema: inputSchema,
    },
    command,
    roles: ["ADMIN"],
    category: "content",
    executionMode: "deferred",
    deferred: {
      dedupeStrategy: "per-conversation-payload",
      retryable: true,
      notificationPolicy: "completion-and-failure",
    },
  };
}

const ARTICLE_INPUT_SCHEMA = {
  type: "object",
  properties: {
    post_id: { type: "string", description: "Optional existing blog post ID for artifact persistence." },
    title: { type: "string", description: "Article title." },
    description: { type: "string", description: "Article description." },
    content: { type: "string", description: "Structured markdown article content." },
  },
  required: ["title", "description", "content"],
};

export function createComposeBlogArticleTool(
  service: BlogArticleProductionService,
): ToolDescriptor<ComposeBlogArticleInput, Awaited<ReturnType<typeof executeComposeBlogArticle>>> {
  return deferredAdminTool(
    "compose_blog_article",
    "Compose a structured markdown blog article from a brief, audience, and objective. Admin only.",
    {
      type: "object",
      properties: {
        brief: { type: "string", description: "The content brief." },
        audience: { type: "string", description: "Optional target audience." },
        objective: { type: "string", description: "Optional business objective." },
        tone: { type: "string", description: "Optional editorial tone." },
      },
      required: ["brief"],
    },
    new ComposeBlogArticleCommand(service),
  );
}

export function createQaBlogArticleTool(
  service: BlogArticleProductionService,
): ToolDescriptor<QaBlogArticleInput, Awaited<ReturnType<typeof executeQaBlogArticle>>> {
  return deferredAdminTool(
    "qa_blog_article",
    "Run editorial QA against a structured markdown blog article and return normalized findings. Admin only.",
    ARTICLE_INPUT_SCHEMA,
    new QaBlogArticleCommand(service),
  );
}

export function createResolveBlogArticleQaTool(
  service: BlogArticleProductionService,
): ToolDescriptor<ResolveBlogArticleQaInput, Awaited<ReturnType<typeof executeResolveBlogArticleQa>>> {
  return deferredAdminTool(
    "resolve_blog_article_qa",
    "Revise a structured markdown blog article to resolve a normalized QA report. Admin only.",
    {
      ...ARTICLE_INPUT_SCHEMA,
      properties: {
        ...ARTICLE_INPUT_SCHEMA.properties,
        qa_report: {
          type: "object",
          description: "The normalized QA report returned by qa_blog_article.",
        },
      },
      required: ["title", "description", "content", "qa_report"],
    },
    new ResolveBlogArticleQaCommand(service),
  );
}

export function createGenerateBlogImagePromptTool(
  service: BlogArticleProductionService,
): ToolDescriptor<GenerateBlogImagePromptInput, Awaited<ReturnType<typeof executeGenerateBlogImagePrompt>>> {
  return deferredAdminTool(
    "generate_blog_image_prompt",
    "Design a blog hero-image prompt, alt text, size, and quality from a final article. Admin only.",
    ARTICLE_INPUT_SCHEMA,
    new GenerateBlogImagePromptCommand(service),
  );
}

export function createProduceBlogArticleTool(
  service: BlogArticleProductionService,
): ToolDescriptor<ProduceBlogArticleInput, ProduceBlogArticleOutput> {
  return deferredAdminTool(
    "produce_blog_article",
    "Compose, QA, resolve, design the hero image prompt, generate the hero image, and persist a linked blog draft with artifacts. Admin only.",
    {
      type: "object",
      properties: {
        brief: { type: "string", description: "The content brief." },
        audience: { type: "string", description: "Optional target audience." },
        objective: { type: "string", description: "Optional business objective." },
        tone: { type: "string", description: "Optional editorial tone." },
        enhance_image_prompt: {
          type: "boolean",
          description: "Allow provider-side prompt enhancement for the generated hero image.",
        },
      },
      required: ["brief"],
    },
    new ProduceBlogArticleCommand(service),
  );
}