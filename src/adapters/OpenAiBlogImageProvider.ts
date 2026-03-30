import type OpenAI from "openai";

import type {
  BlogImageGenerationRequest,
  BlogImageGenerationResult,
  BlogImageProvider,
} from "@/core/use-cases/BlogImageProvider";

function inferDimensions(size: BlogImageGenerationRequest["size"]): {
  width: number | null;
  height: number | null;
} {
  switch (size) {
    case "1024x1024":
      return { width: 1024, height: 1024 };
    case "1536x1024":
      return { width: 1536, height: 1024 };
    case "1024x1536":
      return { width: 1024, height: 1536 };
    case "auto":
      return { width: null, height: null };
  }
}

type OpenAiImageResponse = {
  data?: Array<{
    b64_json?: string | null;
    revised_prompt?: string | null;
    mime_type?: string | null;
  }>;
};

export class OpenAiBlogImageProvider implements BlogImageProvider {
  constructor(
    private readonly openai: OpenAI,
    private readonly model = "gpt-image-1",
  ) {}

  async generate(
    request: BlogImageGenerationRequest,
  ): Promise<BlogImageGenerationResult> {
    const response = await this.openai.images.generate({
      model: this.model,
      prompt: request.prompt,
      size: request.size === "auto" ? undefined : request.size,
      quality: request.quality === "auto" ? undefined : request.quality,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any) as OpenAiImageResponse;

    const image = response.data?.[0];
    const b64 = image?.b64_json;

    if (!b64) {
      throw new Error("OpenAI image generation returned no image bytes.");
    }

    const dimensions = inferDimensions(request.size);
    const revisedPrompt = image?.revised_prompt?.trim() || request.prompt;

    return {
      bytes: Buffer.from(b64, "base64"),
      mimeType: image?.mime_type?.trim() || "image/png",
      width: dimensions.width,
      height: dimensions.height,
      originalPrompt: request.prompt,
      finalPrompt: request.enhancePrompt === false ? request.prompt : revisedPrompt,
      provider: "openai",
      model: this.model,
    };
  }
}