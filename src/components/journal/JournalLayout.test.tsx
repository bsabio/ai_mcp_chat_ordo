import type { ImgHTMLAttributes } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  JournalArticleHeader,
  JournalFeatureCard,
  JournalIntroCard,
  JournalSectionEmptyState,
  JournalStoryCard,
} from "@/components/journal/JournalLayout";

vi.mock("next/image", () => ({
  default: ({ priority: _priority, ...props }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => <img {...props} alt={props.alt ?? ""} />,
}));

describe("JournalLayout", () => {
  it("applies semantic journal intro and feature surfaces", () => {
    const { container } = render(
      <>
        <JournalIntroCard kicker="Journal" title="Systems writing" dek="Clear writing." meta={[{ label: "Posts", value: "12" }]} />
        <JournalFeatureCard
          href="/journal/example"
          eyebrow="Essay"
          title="Lead story"
          description="Feature description"
          image={{ src: "/hero.png", alt: "Hero", width: 1200, height: 800 }}
        />
      </>,
    );

    expect(container.querySelector('[data-journal-surface="intro-card"]')?.className).toContain("journal-intro-card");
    expect(container.querySelector('[data-journal-surface="feature-media"]')?.className).toContain("journal-feature-media");
  });

  it("uses explicit tone variants for story cards and empty states", () => {
    const { container } = render(
      <>
        <JournalStoryCard href="/journal/essay" eyebrow="Essay" title="Essay title" tone="essay" />
        <JournalStoryCard href="/journal/briefing" eyebrow="Briefing" title="Briefing title" tone="briefing" />
        <JournalSectionEmptyState title="No essays" description="Nothing yet" tone="essay" />
        <JournalSectionEmptyState title="No briefings" description="Nothing yet" tone="briefing" />
      </>,
    );

    expect(container.querySelector('[data-journal-entry-tone="essay"]')?.className).toContain("journal-story-essay");
    expect(container.querySelector('[data-journal-entry-tone="briefing"]')?.className).toContain("journal-story-briefing");
    expect(container.querySelector('[data-journal-surface="empty-essay"]')?.className).toContain("journal-empty-essay");
    expect(container.querySelector('[data-journal-surface="empty-briefing"]')?.className).toContain("journal-empty-briefing");
  });

  it("applies semantic article header variants by tone", () => {
    const { container } = render(
      <>
        <JournalArticleHeader kicker="Journal" title="Essay article" meta={["March 27, 2026"]} tone="essay" />
        <JournalArticleHeader kicker="Journal" title="Briefing article" meta={["March 27, 2026"]} tone="briefing" />
      </>,
    );

    const headers = container.querySelectorAll('[data-journal-role="article-header"]');
    expect(headers[0]?.className).toContain("journal-article-header");
    expect(headers[1]?.className).toContain("journal-article-header-briefing");
    expect(container.querySelector('[data-journal-role="article-header"][data-journal-article-tone="briefing"]')?.className).toContain("journal-article-header-briefing");
  });
});