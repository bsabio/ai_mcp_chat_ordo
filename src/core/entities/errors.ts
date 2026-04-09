import type { ContentAudience } from "@/lib/access/content-access";
import { NotFoundError, ForbiddenError } from "@/core/common/errors";

export class ResourceNotFoundError extends NotFoundError {}

export class ContentAccessDeniedError extends ForbiddenError {
  constructor(
    message: string,
    public readonly audience: ContentAudience,
  ) {
    super(message);
  }
}
