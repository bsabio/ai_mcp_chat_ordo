import Anthropic from "@anthropic-ai/sdk";

import type {
  BlogArticlePipelineModel,
  BlogImagePromptDesign,
  BlogQaReport,
  ComposeBlogArticleInput,
  ComposedBlogArticle,
  ResolvedBlogArticle,
} from "@/core/use-cases/BlogArticlePipelineModel";

type JsonObject = Record<string, unknown>;

interface JsonRequestOptions {
  userContent: string;
  systemInstructions: string;
  maxTokens: number;
  expectedShape: string;
}

function extractFirstText(response: Anthropic.Message): string {
  const textBlock = response.content.find((block) => block.type === "text");
  const text = textBlock?.text?.trim();

  if (!text) {
    throw new Error("Anthropic article pipeline returned no text response.");
  }

  return text;
}

function extractJsonObject(text: string): JsonObject {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fencedMatch?.[1]?.trim() ?? text;
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Anthropic article pipeline did not return valid JSON.");
  }

  return JSON.parse(raw.slice(firstBrace, lastBrace + 1)) as JsonObject;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Anthropic article pipeline returned invalid ${label}.`);
  }

  return value.trim();
}

function createJsonSystemPrompt(instructions: string): string {
  return `${instructions}\nReturn JSON only. Do not wrap the response in markdown code fences.`;
}

function preview(text: string): string {
  return JSON.stringify(text.slice(0, 280));
}

export class AnthropicBlogArticlePipelineModel implements BlogArticlePipelineModel {
  constructor(
    private readonly client: Anthropic,
    private readonly model: string,
  ) {}

  private async requestJsonObject(options: JsonRequestOptions): Promise<JsonObject> {
    const initialResponse = await this.client.messages.create({
      model: this.model,
      max_tokens: options.maxTokens,
      system: createJsonSystemPrompt(options.systemInstructions),
      messages: [{
        role: "user",
        content: options.userContent,
      }],
    });

    const initialText = extractFirstText(initialResponse);
    const repairMaxTokens = Math.max(options.maxTokens, 3200);

    try {
      return extractJsonObject(initialText);
    } catch {
      const repairedResponse = await this.client.messages.create({
        model: this.model,
        max_tokens: repairMaxTokens,
        system: createJsonSystemPrompt(
          "You repair prior assistant output into a single valid JSON object. Preserve the original meaning and markdown content, but fix formatting so the response is parseable JSON.",
        ),
        messages: [{
          role: "user",
          content: [
            `Convert the following content into exactly one valid JSON object with this shape: ${options.expectedShape}`,
            "If a field is missing, infer the smallest valid value from the content.",
            "Previous response:",
            initialText,
          ].join("\n\n"),
        }],
      });

      const repairedText = extractFirstText(repairedResponse);

      try {
        return extractJsonObject(repairedText);
      } catch {
        throw new Error(
          `Anthropic article pipeline did not return valid JSON. Initial stop reason: ${initialResponse.stop_reason ?? "unknown"}. Repair stop reason: ${repairedResponse.stop_reason ?? "unknown"}. Initial response preview: ${preview(initialText)}. Repair response preview: ${preview(repairedText)}.`,
        );
      }
    }
  }

  async composeArticle(input: ComposeBlogArticleInput): Promise<ComposedBlogArticle> {
    const payload = await this.requestJsonObject({
      maxTokens: 3200,
      systemInstructions:
        "You create professional blog drafts in structured markdown. Include headings, lists, links, quotes, tables, emphasis, or code fences where they improve readability. Never repeat the title inside the content body.",
      userContent: [
        `Brief: ${input.brief}`,
        input.audience ? `Audience: ${input.audience}` : null,
        input.objective ? `Objective: ${input.objective}` : null,
        input.tone ? `Tone: ${input.tone}` : null,
        "Return { title, description, content }.",
      ].filter(Boolean).join("\n"),
      expectedShape: "{ title, description, content }",
    });

    return {
      title: requireString(payload.title, "title"),
      description: requireString(payload.description, "description"),
      content: requireString(payload.content, "content"),
    };
  }

  async reviewArticle(article: ComposedBlogArticle): Promise<BlogQaReport> {
    const payload = await this.requestJsonObject({
      maxTokens: 1800,
      systemInstructions:
        "You are an editorial QA reviewer. Review the article for clarity, structure, factual restraint, accessibility, and business usefulness. Use high severity for publication blockers only.",
      userContent: [
        `Title: ${article.title}`,
        `Description: ${article.description}`,
        `Content:\n${article.content}`,
        "Return { approved, summary, findings: [{ id, severity, issue, recommendation }] }.",
      ].join("\n\n"),
      expectedShape: "{ approved, summary, findings: [{ id, severity, issue, recommendation }] }",
    });
    const findings = Array.isArray(payload.findings)
      ? payload.findings.map((finding, index) => {
        const record = finding as JsonObject;
        return {
          id: requireString(record.id ?? `finding_${index + 1}`, "finding id"),
          severity: requireString(record.severity, "finding severity") as "low" | "medium" | "high",
          issue: requireString(record.issue, "finding issue"),
          recommendation: requireString(record.recommendation, "finding recommendation"),
        };
      })
      : [];

    return {
      approved: Boolean(payload.approved),
      summary: requireString(payload.summary, "qa summary"),
      findings,
    };
  }

  async resolveQa(
    article: ComposedBlogArticle,
    report: BlogQaReport,
  ): Promise<ResolvedBlogArticle> {
    const payload = await this.requestJsonObject({
      maxTokens: 3200,
      systemInstructions:
        "You revise blog articles to resolve editorial QA findings while preserving the article's main intent and keeping structured markdown.",
      userContent: [
        `Title: ${article.title}`,
        `Description: ${article.description}`,
        `Content:\n${article.content}`,
        `QA report: ${JSON.stringify(report)}`,
        "Return { title, description, content, resolutionSummary }.",
      ].join("\n\n"),
      expectedShape: "{ title, description, content, resolutionSummary }",
    });

    return {
      title: requireString(payload.title, "resolved title"),
      description: requireString(payload.description, "resolved description"),
      content: requireString(payload.content, "resolved content"),
      resolutionSummary: requireString(payload.resolutionSummary, "resolution summary"),
    };
  }

  async designHeroImagePrompt(
    article: ComposedBlogArticle,
  ): Promise<BlogImagePromptDesign> {
    const payload = await this.requestJsonObject({
      maxTokens: 1400,
      systemInstructions:
        "You design editorial hero-image prompts for blog posts. Produce a safe descriptive prompt, accessible alt text, and recommend size and quality using only 1024x1024, 1536x1024, 1024x1536, auto and low, medium, high, auto.",
      userContent: [
        `Title: ${article.title}`,
        `Description: ${article.description}`,
        `Content:\n${article.content}`,
        "Return { prompt, altText, size, quality, summary }.",
      ].join("\n\n"),
      expectedShape: "{ prompt, altText, size, quality, summary }",
    });

    return {
      prompt: requireString(payload.prompt, "image prompt"),
      altText: requireString(payload.altText, "image altText"),
      size: requireString(payload.size, "image size") as BlogImagePromptDesign["size"],
      quality: requireString(payload.quality, "image quality") as BlogImagePromptDesign["quality"],
      summary: requireString(payload.summary, "image summary"),
    };
  }
}