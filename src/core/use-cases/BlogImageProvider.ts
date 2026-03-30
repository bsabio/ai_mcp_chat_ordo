export type BlogImageSize = "1024x1024" | "1536x1024" | "1024x1536" | "auto";
export type BlogImageQuality = "low" | "medium" | "high" | "auto";
export type BlogImagePreset = "portrait" | "landscape" | "square" | "hd" | "artistic";

export interface BlogImageGenerationRequest {
  prompt: string;
  size: BlogImageSize;
  quality: BlogImageQuality;
  preset?: BlogImagePreset;
  enhancePrompt?: boolean;
}

export interface BlogImageGenerationResult {
  bytes: Buffer;
  mimeType: string;
  width: number | null;
  height: number | null;
  originalPrompt: string;
  finalPrompt: string;
  provider: string;
  model: string;
}

export interface BlogImageProvider {
  generate(request: BlogImageGenerationRequest): Promise<BlogImageGenerationResult>;
}