import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import {
  getBlogAssetRepository,
  getBlogPostArtifactRepository,
  getBlogPostRepository,
} from "@/adapters/RepositoryFactory";
import { AnthropicBlogArticlePipelineModel } from "@/adapters/AnthropicBlogArticlePipelineModel";
import { OpenAiBlogImageProvider } from "@/adapters/OpenAiBlogImageProvider";
import type { BlogArticlePipelineModel } from "@/core/use-cases/BlogArticlePipelineModel";
import type {
  BlogImageGenerationRequest,
  BlogImageProvider,
} from "@/core/use-cases/BlogImageProvider";
import { BlogArticleProductionService } from "@/lib/blog/blog-article-production-service";
import {
  getAnthropicApiKey,
  getAnthropicModel,
  getOpenaiApiKey,
} from "@/lib/config/env";
import { BlogImageGenerationService } from "@/lib/blog/blog-image-generation-service";

let blogImageGenerationService: BlogImageGenerationService | null = null;
let blogArticleProductionService: BlogArticleProductionService | null = null;

const lazyOpenAiBlogImageProvider: BlogImageProvider = {
  async generate(request: BlogImageGenerationRequest) {
    const provider = new OpenAiBlogImageProvider(
      new OpenAI({ apiKey: getOpenaiApiKey() }),
    );
    return provider.generate(request);
  },
};

const lazyAnthropicBlogArticlePipelineModel: BlogArticlePipelineModel = {
  composeArticle(input, options) {
    return createAnthropicBlogArticlePipelineModel().composeArticle(input, options);
  },
  reviewArticle(article, options) {
    return createAnthropicBlogArticlePipelineModel().reviewArticle(article, options);
  },
  resolveQa(article, report, options) {
    return createAnthropicBlogArticlePipelineModel().resolveQa(article, report, options);
  },
  designHeroImagePrompt(article, options) {
    return createAnthropicBlogArticlePipelineModel().designHeroImagePrompt(article, options);
  },
};

function createAnthropicBlogArticlePipelineModel(): BlogArticlePipelineModel {
  return new AnthropicBlogArticlePipelineModel(
    new Anthropic({ apiKey: getAnthropicApiKey() }),
    getAnthropicModel(),
  );
}

export function getBlogImageGenerationService(): BlogImageGenerationService {
  if (!blogImageGenerationService) {
    blogImageGenerationService = new BlogImageGenerationService(
      getBlogPostRepository(),
      getBlogAssetRepository(),
      lazyOpenAiBlogImageProvider,
      getBlogPostArtifactRepository(),
    );
  }

  return blogImageGenerationService;
}

export function getBlogArticleProductionService(): BlogArticleProductionService {
  if (!blogArticleProductionService) {
    blogArticleProductionService = new BlogArticleProductionService(
      lazyAnthropicBlogArticlePipelineModel,
      getBlogPostRepository(),
      getBlogAssetRepository(),
      getBlogPostArtifactRepository(),
      getBlogImageGenerationService(),
    );
  }

  return blogArticleProductionService;
}