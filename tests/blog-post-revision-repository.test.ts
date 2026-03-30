import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";

import { BlogPostDataMapper } from "@/adapters/BlogPostDataMapper";
import { BlogPostRevisionDataMapper } from "@/adapters/BlogPostRevisionDataMapper";
import { JournalEditorialMutationDataMapper } from "@/adapters/JournalEditorialMutationDataMapper";
import { JournalEditorialInteractor } from "@/core/use-cases/JournalEditorialInteractor";
import { ensureSchema } from "@/lib/db/schema";

describe("BlogPostRevisionDataMapper and JournalEditorialInteractor", () => {
  let db: Database.Database;
  let postRepo: BlogPostDataMapper;
  let revisionRepo: BlogPostRevisionDataMapper;
  let mutationRepo: JournalEditorialMutationDataMapper;
  let editorial: JournalEditorialInteractor;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    ensureSchema(db);
    db.prepare(`INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`).run(
      "usr_admin",
      "admin@example.com",
      "Admin",
    );
    postRepo = new BlogPostDataMapper(db);
    revisionRepo = new BlogPostRevisionDataMapper(db);
    mutationRepo = new JournalEditorialMutationDataMapper(db);
    editorial = new JournalEditorialInteractor(postRepo, revisionRepo, mutationRepo);
  });

  it("persists revisions with full editorial snapshots", async () => {
    const post = await postRepo.create({
      slug: "revision-post",
      title: "Revision Post",
      description: "Revision description.",
      content: "## Revision\n\nBody.",
      standfirst: "Revision standfirst.",
      section: "briefing",
      createdByUserId: "usr_admin",
    });

    await revisionRepo.create({
      postId: post.id,
      snapshot: {
        slug: post.slug,
        title: post.title,
        description: post.description,
        standfirst: post.standfirst ?? null,
        content: post.content,
        section: post.section ?? null,
        status: post.status,
      },
      changeNote: "Captured initial draft.",
      createdByUserId: "usr_admin",
    });

    const revisions = await revisionRepo.listByPostId(post.id);
    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.snapshot).toMatchObject({
      standfirst: "Revision standfirst.",
      section: "briefing",
      status: "draft",
    });
    expect(revisions[0]?.changeNote).toBe("Captured initial draft.");
  });

  it("records a pre-change revision before metadata and workflow updates", async () => {
    const post = await postRepo.create({
      slug: "workflow-post",
      title: "Workflow Post",
      description: "Original description.",
      content: "## Workflow\n\nBody.",
      createdByUserId: "usr_admin",
    });

    await editorial.updateEditorialMetadata({
      postId: post.id,
      patch: {
        standfirst: "Explicit opener.",
        section: "essay",
      },
      actorUserId: "usr_admin",
      changeNote: "Prepared for review.",
    });

    const reviewed = await editorial.transitionWorkflow({
      postId: post.id,
      nextStatus: "review",
      actorUserId: "usr_admin",
    });

    expect(reviewed.status).toBe("review");

    const revisions = await revisionRepo.listByPostId(post.id);
    expect(revisions).toHaveLength(2);
    expect(revisions[0]?.snapshot.status).toBe("draft");
    expect(revisions[1]?.snapshot.status).toBe("draft");
  });

  it("restores a revision by creating a new head revision and reapplying snapshot state", async () => {
    const post = await postRepo.create({
      slug: "restore-post",
      title: "Restore Post",
      description: "Original description.",
      content: "## Original\n\nBody.",
      standfirst: "Original standfirst.",
      section: "essay",
      createdByUserId: "usr_admin",
    });

    const baselineRevision = await revisionRepo.create({
      postId: post.id,
      snapshot: {
        slug: post.slug,
        title: post.title,
        description: post.description,
        standfirst: post.standfirst ?? null,
        content: post.content,
        section: post.section ?? null,
        status: post.status,
      },
      changeNote: "Initial baseline.",
      createdByUserId: "usr_admin",
    });

    await editorial.updateDraftContent({
      postId: post.id,
      patch: {
        content: "## Updated\n\nChanged body.",
        description: "Changed description.",
      },
      actorUserId: "usr_admin",
    });

    await editorial.updateEditorialMetadata({
      postId: post.id,
      patch: {
        standfirst: "Changed standfirst.",
        section: "briefing",
      },
      actorUserId: "usr_admin",
    });

    const restored = await editorial.restoreRevision({
      postId: post.id,
      revisionId: baselineRevision.id,
      actorUserId: "usr_admin",
    });

    expect(restored.description).toBe("Original description.");
    expect(restored.content).toContain("## Original");
    expect(restored.standfirst).toBe("Original standfirst.");
    expect(restored.section).toBe("essay");

    const revisions = await revisionRepo.listByPostId(post.id);
    expect(revisions.length).toBeGreaterThanOrEqual(3);
  });

  it("clears publication metadata when a published post is restored to draft", async () => {
    const post = await postRepo.create({
      slug: "published-restore",
      title: "Published Restore",
      description: "Original description.",
      content: "## Original\n\nBody.",
      createdByUserId: "usr_admin",
    });

    const draftRevision = await revisionRepo.create({
      postId: post.id,
      snapshot: {
        slug: post.slug,
        title: post.title,
        description: post.description,
        standfirst: post.standfirst ?? null,
        content: post.content,
        section: post.section ?? null,
        status: "draft",
      },
      changeNote: "Draft baseline.",
      createdByUserId: "usr_admin",
    });

    await editorial.transitionWorkflow({
      postId: post.id,
      nextStatus: "review",
      actorUserId: "usr_admin",
    });
    await editorial.transitionWorkflow({
      postId: post.id,
      nextStatus: "approved",
      actorUserId: "usr_admin",
    });
    const published = await editorial.transitionWorkflow({
      postId: post.id,
      nextStatus: "published",
      actorUserId: "usr_admin",
    });

    expect(published.publishedAt).not.toBeNull();
    expect(published.publishedByUserId).toBe("usr_admin");

    const restored = await editorial.restoreRevision({
      postId: post.id,
      revisionId: draftRevision.id,
      actorUserId: "usr_admin",
    });

    expect(restored.status).toBe("draft");
    expect(restored.publishedAt).toBeNull();
    expect(restored.publishedByUserId).toBeNull();
  });

  it("allows the legal forward workflow path and records publish metadata", async () => {
    const post = await postRepo.create({
      slug: "legal-forward-path",
      title: "Legal Forward Path",
      description: "Workflow path coverage.",
      content: "## Workflow\n\nBody.",
      createdByUserId: "usr_admin",
    });

    const reviewed = await editorial.transitionWorkflow({
      postId: post.id,
      nextStatus: "review",
      actorUserId: "usr_admin",
    });
    const approved = await editorial.transitionWorkflow({
      postId: post.id,
      nextStatus: "approved",
      actorUserId: "usr_admin",
    });
    const published = await editorial.transitionWorkflow({
      postId: post.id,
      nextStatus: "published",
      actorUserId: "usr_admin",
    });

    expect(reviewed.status).toBe("review");
    expect(approved.status).toBe("approved");
    expect(published.status).toBe("published");
    expect(published.publishedAt).not.toBeNull();
    expect(published.publishedByUserId).toBe("usr_admin");

    const revisions = await revisionRepo.listByPostId(post.id);
    expect(revisions).toHaveLength(3);
    expect(
      revisions
        .map((revision) => revision.snapshot.status)
        .slice()
        .sort(),
    ).toEqual(["approved", "draft", "review"]);
  });

  it("rejects restoring an unknown revision id without mutating the post", async () => {
    const post = await postRepo.create({
      slug: "missing-revision",
      title: "Missing Revision",
      description: "Original description.",
      content: "## Original\n\nBody.",
      createdByUserId: "usr_admin",
    });

    await editorial.updateDraftContent({
      postId: post.id,
      patch: {
        title: "Changed title",
      },
      actorUserId: "usr_admin",
    });

    await expect(editorial.restoreRevision({
      postId: post.id,
      revisionId: "missing_revision",
      actorUserId: "usr_admin",
    })).rejects.toThrow(/revision not found/i);

    const afterFailure = await postRepo.findById(post.id);
    expect(afterFailure?.title).toBe("Changed title");
  });

  it("restores revisions atomically so failed writes do not leave partial state", async () => {
    const post = await postRepo.create({
      slug: "atomic-restore",
      title: "Atomic Restore",
      description: "Original description.",
      content: "## Original\n\nBody.",
      standfirst: "Original standfirst.",
      section: "essay",
      createdByUserId: "usr_admin",
    });

    const baselineRevision = await revisionRepo.create({
      postId: post.id,
      snapshot: {
        slug: post.slug,
        title: post.title,
        description: post.description,
        standfirst: post.standfirst ?? null,
        content: post.content,
        section: post.section ?? null,
        status: post.status,
      },
      changeNote: "Baseline.",
      createdByUserId: "usr_admin",
    });

    await editorial.updateDraftContent({
      postId: post.id,
      patch: {
        title: "Changed title",
        description: "Changed description.",
        content: "## Changed\n\nBody.",
      },
      actorUserId: "usr_admin",
    });

    const failingEditorial = new JournalEditorialInteractor(
      postRepo,
      revisionRepo,
      {
        restoreRevisionAtomically: async () => {
          throw new Error("synthetic restore failure");
        },
      },
    );

    await expect(failingEditorial.restoreRevision({
      postId: post.id,
      revisionId: baselineRevision.id,
      actorUserId: "usr_admin",
    })).rejects.toThrow(/synthetic restore failure/i);

    const afterFailure = await postRepo.findById(post.id);
    expect(afterFailure).toMatchObject({
      title: "Changed title",
      description: "Changed description.",
    });

    const revisions = await revisionRepo.listByPostId(post.id);
    expect(revisions).toHaveLength(2);
    expect(revisions[0]?.changeNote).not.toMatch(/restored revision/i);
  });

  it("rejects illegal workflow transitions", async () => {
    const post = await postRepo.create({
      slug: "illegal-transition",
      title: "Illegal Transition",
      description: "Desc.",
      content: "## Illegal\n\nBody.",
      createdByUserId: "usr_admin",
    });

    await expect(editorial.transitionWorkflow({
      postId: post.id,
      nextStatus: "published",
      actorUserId: "usr_admin",
    })).rejects.toThrow(/illegal workflow transition/i);
  });

});