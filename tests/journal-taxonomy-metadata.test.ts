import { describe, expect, it } from "vitest";

import type { BlogPost } from "@/core/entities/blog";
import {
  buildJournalPublicationStructure,
  describeJournalPost,
  splitJournalLeadBody,
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

  it("extracts an opening body block before the remaining article content", () => {
    const result = splitJournalLeadBody("Opening paragraph.\n\n## Body\n\nRest.");

    expect(result.lead).toBe("Opening paragraph.");
    expect(result.remainder).toBe("## Body\n\nRest.");
  });

  it("keeps a leading heading paired with the first body block", () => {
    const result = splitJournalLeadBody("## Deep\n\nDive content.\n\n## Later\n\nMore detail.");

    expect(result.lead).toBe("## Deep\n\nDive content.");
    expect(result.remainder).toBe("## Later\n\nMore detail.");
  });

  it("groups older posts into archive years after live shelves are filled", () => {
    const posts = [
      createPost({ id: "post_1", slug: "lead-essay", title: "Lead Essay", publishedAt: "2026-04-09T00:00:00.000Z", content: "A reflective essay.\n\n## Deep\n\nMore prose." }),
      createPost({ id: "post_2", slug: "essay-2", title: "Essay Two", publishedAt: "2026-04-08T00:00:00.000Z", content: "A reflective essay.\n\n## Deep\n\nMore prose." }),
      createPost({ id: "post_3", slug: "essay-3", title: "Essay Three", publishedAt: "2026-04-07T00:00:00.000Z", content: "A reflective essay.\n\n## Deep\n\nMore prose." }),
      createPost({ id: "post_4", slug: "essay-4", title: "Essay Four", publishedAt: "2026-04-06T00:00:00.000Z", content: "A reflective essay.\n\n## Deep\n\nMore prose." }),
      createPost({ id: "post_5", slug: "briefing-1", title: "QA Playbook", description: "Operational guidance.", publishedAt: "2026-04-05T00:00:00.000Z", content: "## Checklist\n\n- Validate\n- Release" }),
      createPost({ id: "post_6", slug: "briefing-2", title: "Release Runbook", description: "Operational guidance.", publishedAt: "2026-04-04T00:00:00.000Z", content: "## Checklist\n\n- Validate\n- Release" }),
      createPost({ id: "post_7", slug: "briefing-3", title: "Audit Brief", description: "Operational guidance.", publishedAt: "2026-04-03T00:00:00.000Z", content: "## Checklist\n\n- Validate\n- Release" }),
      createPost({ id: "post_8", slug: "archive-2025", title: "Older Systems Note", publishedAt: "2025-08-08T00:00:00.000Z", content: "A reflective essay.\n\n## Deep\n\nMore prose." }),
      createPost({ id: "post_9", slug: "archive-2024", title: "Archive Runbook", description: "Operational guidance.", publishedAt: "2024-08-08T00:00:00.000Z", content: "## Checklist\n\n- Validate\n- Release" }),
      createPost({ id: "post_10", slug: "archive-2023", title: "Legacy Note", publishedAt: "2023-08-08T00:00:00.000Z", content: "A reflective essay.\n\n## Deep\n\nMore prose." }),
    ];

    const publication = buildJournalPublicationStructure(posts);

    expect(publication.leadStory?.post.slug).toBe("lead-essay");
    expect(publication.latestEssays.map((entry) => entry.post.slug)).toEqual(["essay-2", "essay-3", "essay-4"]);
    expect(publication.practicalBriefings.map((entry) => entry.post.slug)).toEqual(["briefing-1", "briefing-2", "briefing-3"]);
    expect(publication.archiveGroups.map((group) => group.year)).toEqual(["2025", "2024", "2023"]);
    expect(publication.archiveGroups.flatMap((group) => group.posts.map((entry) => entry.post.slug))).toEqual(["archive-2025", "archive-2024", "archive-2023"]);
  });
});