export const DEFERRED_JOB_HANDLER_NAMES = [
  "draft_content",
  "publish_content",
  "prepare_journal_post_for_publish",
  "generate_blog_image",
  "compose_blog_article",
  "qa_blog_article",
  "resolve_blog_article_qa",
  "generate_blog_image_prompt",
  "produce_blog_article",
] as const;

export type DeferredJobHandlerName = (typeof DEFERRED_JOB_HANDLER_NAMES)[number];