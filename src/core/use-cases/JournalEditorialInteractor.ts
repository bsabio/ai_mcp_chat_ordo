import type {
  BlogPost,
  BlogPostDraftPatch,
  BlogPostEditorialMetadataPatch,
  BlogPostStatus,
} from "@/core/entities/blog";
import type { BlogPostRevisionSnapshot } from "@/core/entities/blog-revision";
import type { JournalEditorialMutationRepository } from "@/core/use-cases/JournalEditorialMutationRepository";
import type { BlogPostRepository } from "@/core/use-cases/BlogPostRepository";
import type { BlogPostRevisionRepository } from "@/core/use-cases/BlogPostRevisionRepository";
import type { WorkflowConfig } from "@/lib/admin/shared/admin-workflow";

function snapshotFromPost(post: BlogPost): BlogPostRevisionSnapshot {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    standfirst: post.standfirst ?? null,
    content: post.content,
    section: post.section ?? null,
    status: post.status,
  };
}

export const ALLOWED_TRANSITIONS: Record<BlogPostStatus, BlogPostStatus[]> = {
  draft: ["review"],
  review: ["approved", "draft"],
  approved: ["published", "review"],
  published: ["approved"],
};

/** Shared journal workflow config for the admin workflow bar. */
export const JOURNAL_WORKFLOW_CONFIG: WorkflowConfig<BlogPostStatus> = {
  transitions: ALLOWED_TRANSITIONS,
  labels: {
    "draft→review": { label: "Submit for review", description: "Move this draft into editorial review." },
    "review→approved": { label: "Approve for publish", description: "Mark this article approved and ready to publish." },
    "review→draft": { label: "Return to draft", description: "Move this article back to draft for further editing." },
    "approved→published": { label: "Publish to journal", description: "Make this article publicly visible in the journal." },
    "approved→review": { label: "Return to review", description: "Move this article back into editorial review." },
    "published→approved": { label: "Return to approved", description: "Unpublish this article and return it to approved status." },
  },
};

export class JournalEditorialInteractor {
  constructor(
    private readonly blogRepo: BlogPostRepository,
    private readonly revisionRepo: BlogPostRevisionRepository,
    private readonly mutationRepo?: JournalEditorialMutationRepository,
  ) {}

  async updateDraftContent(input: {
    postId: string;
    patch: BlogPostDraftPatch;
    actorUserId: string;
    changeNote?: string | null;
  }): Promise<BlogPost> {
    const post = await this.requirePost(input.postId);
    await this.recordRevision(post, input.actorUserId, input.changeNote ?? "Updated draft content.");
    return this.blogRepo.updateDraftContent(input.postId, input.patch);
  }

  async updateEditorialMetadata(input: {
    postId: string;
    patch: BlogPostEditorialMetadataPatch;
    actorUserId: string;
    changeNote?: string | null;
  }): Promise<BlogPost> {
    const post = await this.requirePost(input.postId);
    await this.recordRevision(post, input.actorUserId, input.changeNote ?? "Updated editorial metadata.");
    return this.blogRepo.updateEditorialMetadata(input.postId, input.patch);
  }

  async transitionWorkflow(input: {
    postId: string;
    nextStatus: BlogPostStatus;
    actorUserId: string;
    changeNote?: string | null;
  }): Promise<BlogPost> {
    const post = await this.requirePost(input.postId);

    if (!ALLOWED_TRANSITIONS[post.status].includes(input.nextStatus)) {
      throw new Error(`Illegal workflow transition: ${post.status} -> ${input.nextStatus}`);
    }

    await this.recordRevision(post, input.actorUserId, input.changeNote ?? `Transitioned from ${post.status} to ${input.nextStatus}.`);
    return this.blogRepo.transitionWorkflow(input.postId, input.nextStatus, input.actorUserId);
  }

  async listRevisions(postId: string) {
    await this.requirePost(postId);
    return this.revisionRepo.listByPostId(postId);
  }

  async restoreRevision(input: {
    postId: string;
    revisionId: string;
    actorUserId: string;
    changeNote?: string | null;
  }): Promise<BlogPost> {
    const post = await this.requirePost(input.postId);
    const revision = await this.revisionRepo.findById(input.revisionId);

    if (!revision || revision.postId !== input.postId) {
      throw new Error(`Revision not found: ${input.revisionId}`);
    }

    const changeNote = input.changeNote ?? `Restored revision ${input.revisionId}.`;

    if (!this.mutationRepo) {
      throw new Error("Journal editorial restore requires an atomic mutation repository.");
    }

    return this.mutationRepo.restoreRevisionAtomically({
      postId: input.postId,
      currentPost: post,
      targetSnapshot: revision.snapshot,
      actorUserId: input.actorUserId,
      changeNote,
    });
  }

  private async requirePost(postId: string): Promise<BlogPost> {
    const post = await this.blogRepo.findById(postId);

    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    return post;
  }

  private async recordRevision(post: BlogPost, actorUserId: string, changeNote: string): Promise<void> {
    await this.revisionRepo.create({
      postId: post.id,
      snapshot: snapshotFromPost(post),
      changeNote,
      createdByUserId: actorUserId,
    });
  }
}