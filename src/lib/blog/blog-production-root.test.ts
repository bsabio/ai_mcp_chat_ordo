import { beforeEach, describe, expect, it, vi } from "vitest";

const getBlogPostRepository = vi.fn();
const getBlogAssetRepository = vi.fn();
const getBlogPostArtifactRepository = vi.fn();
const getOpenaiApiKey = vi.fn();
const getAnthropicApiKey = vi.fn();
const getAnthropicModel = vi.fn();

vi.mock("@/adapters/RepositoryFactory", () => ({
  getBlogPostRepository,
  getBlogAssetRepository,
  getBlogPostArtifactRepository,
}));

vi.mock("@/lib/config/env", () => ({
  getOpenaiApiKey,
  getAnthropicApiKey,
  getAnthropicModel,
}));

describe("blog-production-root", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    getBlogPostRepository.mockReturnValue({
      findById: vi.fn(),
      setHeroImageAsset: vi.fn(),
    });
    getBlogAssetRepository.mockReturnValue({
      create: vi.fn(),
      setVisibility: vi.fn(),
    });
    getBlogPostArtifactRepository.mockReturnValue({
      create: vi.fn(),
    });
    getAnthropicApiKey.mockReturnValue("anthropic_test_key");
    getAnthropicModel.mockReturnValue("claude-haiku-4-5");
  });

  it("constructs the image-generation service without requiring the OpenAI API key eagerly", async () => {
    getOpenaiApiKey.mockImplementation(() => {
      throw new Error("OPENAI_API_KEY must be set to a non-empty value.");
    });

    const { getBlogImageGenerationService } = await import("./blog-production-root");

    expect(() => getBlogImageGenerationService()).not.toThrow();
    expect(getOpenaiApiKey).not.toHaveBeenCalled();
  });

  it("fails only when image generation is invoked and the OpenAI API key is missing", async () => {
    getOpenaiApiKey.mockImplementation(() => {
      throw new Error("OPENAI_API_KEY must be set to a non-empty value.");
    });

    const { getBlogImageGenerationService } = await import("./blog-production-root");
    const service = getBlogImageGenerationService();

    await expect(service.generate({
      prompt: "Editorial office scene",
      altText: "Office scene",
      size: "1536x1024",
      quality: "high",
      enhancePrompt: true,
      createdByUserId: "usr_admin",
    })).rejects.toThrow(/OPENAI_API_KEY must be set/i);
  });
});