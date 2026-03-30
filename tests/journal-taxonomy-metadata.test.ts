import { describe, expect, it } from "vitest";

import type { BlogPost } from "@/core/entities/blog";
import {
  describeJournalPost,
  splitJournalStandfirst,
} from "@/lib/blog/journal-taxonomy";

function createPost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: "post_1",
    slug: "systems-thinking",
    title: "Systems Thinking",
    description: "A reflective essay.",
    content: "## Heading\n\nBody content.",
    standfirst: null,
    section: null,
    heroImageAssetId: null,
    status: "published",
    publishedAt: "2026-03-01T00:00:00.000Z",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    createdByUserId: "usr_admin",
    publishedByUserId: "usr_admin",
    ...overrides,
  };
}

describe("journal taxonomy metadata", () => {
  it("prefers explicit section over heuristic scoring", () => {
    const post = createPost({
      slug: "audit-playbook",
      title: "Audit Playbook",
      description: "Operational guidance.",
      section: "essay",
    });

    const described = describeJournalPost(post);
    expect(described.section).toBe("essay");
    expect(described.sectionLabel).toBe("Essay");
  });

  it("uses explicit standfirst without re-splitting markdown", () => {
    const result = splitJournalStandfirst("First paragraph.\n\n## Body\n\nRest.", "Explicit opener.");

    expect(result.standfirst).toBe("Explicit opener.");
    expect(result.body).toContain("First paragraph.");
  });

  it("falls back to markdown opener splitting when explicit standfirst is absent", () => {
    const result = splitJournalStandfirst("First paragraph.\n\n## Body\n\nRest.");

    expect(result.standfirst).toBe("First paragraph.");
    expect(result.body).toBe("## Body\n\nRest.");
  });
});