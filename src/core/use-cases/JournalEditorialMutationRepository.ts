import type { BlogPost } from "@/core/entities/blog";
import type { BlogPostRevisionSnapshot } from "@/core/entities/blog-revision";

export interface AtomicJournalRevisionRestoreInput {
  postId: string;
  currentPost: BlogPost;
  targetSnapshot: BlogPostRevisionSnapshot;
  actorUserId: string;
  changeNote: string;
}

export interface JournalEditorialMutationRepository {
  restoreRevisionAtomically(input: AtomicJournalRevisionRestoreInput): Promise<BlogPost>;
}