import type { ContentAudience } from "@/lib/access/content-access";

export class ResourceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResourceNotFoundError";
  }
}

export class ContentAccessDeniedError extends Error {
  constructor(
    message: string,
    public readonly audience: ContentAudience,
  ) {
    super(message);
    this.name = "ContentAccessDeniedError";
  }
}
