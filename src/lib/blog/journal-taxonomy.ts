import type { BlogPost } from "@/core/entities/blog";

export type JournalSectionId = "essay" | "briefing";

export interface JournalClassifiedPost {
  post: BlogPost;
  section: JournalSectionId;
  sectionLabel: string;
  publishedLabel: string | null;
  readingTime: string;
}

export interface JournalArchiveGroup {
  year: string;
  href: string;
  posts: JournalClassifiedPost[];
}

export interface JournalPublicationStructure {
  leadStory: JournalClassifiedPost | null;
  latestEssays: JournalClassifiedPost[];
  practicalBriefings: JournalClassifiedPost[];
  archiveGroups: JournalArchiveGroup[];
}

const PRACTICAL_KEYWORDS = [
  "audit",
  "brief",
  "briefing",
  "capabilities",
  "checklist",
  "continuity",
  "control",
  "eval",
  "governance",
  "guide",
  "health",
  "how to",
  "how-to",
  "implementation",
  "launch",
  "operations",
  "pipeline",
  "playbook",
  "practical",
  "process",
  "qa",
  "recovery",
  "release",
  "runbook",
  "sprint",
  "validation",
  "workflow",
];

const ESSAY_KEYWORDS = [
  "critique",
  "design",
  "essay",
  "field note",
  "field-notes",
  "intelligence",
  "journal",
  "note",
  "reflection",
  "story",
  "systems",
  "thinking",
  "why",
];

function formatPublishedDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function estimateReadingTime(content: string) {
  const wordCount = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(2, Math.round(wordCount / 220));

  return `${minutes} min read`;
}

function scoreSection(post: BlogPost) {
  const source = `${post.title} ${post.description} ${post.slug}`.toLowerCase();
  let practicalScore = 0;
  let essayScore = 0;

  for (const keyword of PRACTICAL_KEYWORDS) {
    if (source.includes(keyword)) {
      practicalScore += 3;
    }
  }

  for (const keyword of ESSAY_KEYWORDS) {
    if (source.includes(keyword)) {
      essayScore += 3;
    }
  }

  const codeFenceCount = (post.content.match(/```/g) ?? []).length / 2;
  const headingCount = (post.content.match(/^##?\s+/gm) ?? []).length;
  const listCount = (post.content.match(/^[-*]\s+/gm) ?? []).length + (post.content.match(/^\d+\.\s+/gm) ?? []).length;
  const blockQuoteCount = (post.content.match(/^>\s+/gm) ?? []).length;
  const paragraphCount = post.content.split(/\n\s*\n/).filter(Boolean).length;

  practicalScore += codeFenceCount * 2 + Math.min(headingCount, 4) + Math.min(listCount, 4);
  essayScore += Math.min(blockQuoteCount, 3) * 2 + Math.min(paragraphCount, 6);

  if (post.content.length > 3_500) {
    essayScore += 2;
  }

  return practicalScore > essayScore ? "briefing" : "essay";
}

function classifyPost(post: BlogPost): JournalClassifiedPost {
  const section = post.section ?? scoreSection(post);

  return {
    post,
    section,
    sectionLabel: section === "briefing" ? "Practical briefing" : "Essay",
    publishedLabel: formatPublishedDate(post.publishedAt),
    readingTime: estimateReadingTime(post.content),
  };
}

export function describeJournalPost(post: BlogPost) {
  return classifyPost(post);
}

export function splitJournalStandfirst(markdown: string, explicitStandfirst?: string | null) {
  if (explicitStandfirst && explicitStandfirst.trim().length > 0) {
    return {
      standfirst: explicitStandfirst.trim(),
      body: markdown,
    };
  }

  const trimmed = markdown.trim();

  if (!trimmed) {
    return { standfirst: null, body: markdown };
  }

  const blocks = trimmed.split(/\n\s*\n/);
  const firstBlock = (blocks[0] ?? "").trim();

  if (
    !firstBlock
    || firstBlock.startsWith("#")
    || firstBlock.startsWith(">")
    || firstBlock.startsWith("!")
    || firstBlock.startsWith("-")
    || /^\d+\.\s+/.test(firstBlock)
    || firstBlock.includes("|"))
  {
    return { standfirst: null, body: markdown };
  }

  return {
    standfirst: firstBlock.replace(/\n+/g, " ").trim(),
    body: blocks.slice(1).join("\n\n").trim(),
  };
}

export function buildJournalPublicationStructure(posts: BlogPost[]): JournalPublicationStructure {
  const classified = posts.map(classifyPost);
  const [leadStory, ...remainder] = classified;
  const essays = remainder.filter((entry) => entry.section === "essay");
  const briefings = remainder.filter((entry) => entry.section === "briefing");
  const latestEssays = essays.slice(0, 3);
  const practicalBriefings = briefings.slice(0, 3);
  const liveShelfIds = new Set([
    ...latestEssays.map((entry) => entry.post.id),
    ...practicalBriefings.map((entry) => entry.post.id),
  ]);
  const archiveGroupsMap = new Map<string, JournalClassifiedPost[]>();

  for (const entry of remainder) {
    if (liveShelfIds.has(entry.post.id)) {
      continue;
    }

    const year = entry.post.publishedAt ? new Date(entry.post.publishedAt).getUTCFullYear().toString() : "Archive";
    const existing = archiveGroupsMap.get(year) ?? [];
    existing.push(entry);
    archiveGroupsMap.set(year, existing);
  }

  const archiveGroups = [...archiveGroupsMap.entries()].map(([year, groupPosts]) => ({
    year,
    href: `#archive-${year.toLowerCase()}`,
    posts: groupPosts,
  }));

  return {
    leadStory: leadStory ?? null,
    latestEssays,
    practicalBriefings,
    archiveGroups,
  };
}