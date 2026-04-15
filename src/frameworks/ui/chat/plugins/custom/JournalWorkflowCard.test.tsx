// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { JournalWorkflowCard } from "./JournalWorkflowCard";
import type { ToolPluginProps } from "../../registry/types";

function createPart(overrides: Partial<NonNullable<ToolPluginProps["part"]>> = {}) {
  return {
    type: "job_status" as const,
    jobId: "job_journal_1",
    toolName: "list_journal_posts",
    label: "List Journal Posts",
    status: "succeeded" as const,
    ...overrides,
  };
}

describe("JournalWorkflowCard", () => {
  it("renders journal post listings with metrics and disclosure detail", () => {
    render(
      <JournalWorkflowCard
        part={createPart()}
        toolCall={{
          name: "list_journal_posts",
          args: { status: "draft" },
          result: {
            action: "list_journal_posts",
            list_route: "/admin/journal",
            filters: { search: "", status: "draft", section: "all", limit: 25 },
            counts: { all: 3, draft: 2, review: 1, approved: 0, published: 0 },
            posts: [
              {
                id: "post_1",
                slug: "launch-plan",
                title: "Launch Plan",
                status: "draft",
                section: "essay",
                standfirst: "Executive summary for launch week.",
                hero_image_asset_id: null,
                preview_route: "/admin/journal/preview/launch-plan",
                detail_route: "/admin/journal/post_1",
                public_route: null,
              },
            ],
            summary: "Found 1 journal post matching the current admin filters.",
          },
        }}
        isStreaming={false}
      />,
    );

    expect(screen.getByText("Journal posts")).toBeInTheDocument();
    expect(screen.getByText("1 loaded")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Post list/i }));

    expect(screen.getByText(/Executive summary for launch week\./)).toBeInTheDocument();
  });

  it("renders mutation summaries with post route links", () => {
    render(
      <JournalWorkflowCard
        part={createPart({ toolName: "update_journal_metadata", label: "Update Journal Metadata" })}
        toolCall={{
          name: "update_journal_metadata",
          args: { post_id: "post_1", title: "Launch Plan" },
          result: {
            action: "update_journal_metadata",
            summary: 'Updated journal metadata for "Launch Plan".',
            post: {
              id: "post_1",
              slug: "launch-plan",
              title: "Launch Plan",
              status: "draft",
              section: "essay",
              standfirst: "Executive summary for launch week.",
              hero_image_asset_id: "asset_1",
              preview_route: "/admin/journal/preview/launch-plan",
              detail_route: "/admin/journal/post_1",
              public_route: null,
            },
          },
        }}
        isStreaming={false}
      />,
    );

    expect(screen.getByText("Launch Plan")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open workspace" })).toHaveAttribute("href", "/admin/journal/post_1");
  });

  it("renders selected hero image previews", () => {
    render(
      <JournalWorkflowCard
        part={createPart({ toolName: "select_journal_hero_image", label: "Select Journal Hero Image" })}
        toolCall={{
          name: "select_journal_hero_image",
          args: { post_id: "post_1", asset_id: "asset_1" },
          result: {
            action: "select_journal_hero_image",
            post_id: "post_1",
            asset_id: "asset_1",
            preview_route: "/admin/journal/preview/launch-plan",
            summary: "Selected the launch hero image.",
            hero_image: {
              post_slug: "launch-plan",
              visibility: "draft",
              image_url: "/api/blog/assets/asset_1",
            },
          },
        }}
        isStreaming={false}
      />,
    );

    expect(screen.getByText("Hero image selected")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Hero image for launch-plan" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open image" })).toHaveAttribute("href", "/api/blog/assets/asset_1");
  });
});