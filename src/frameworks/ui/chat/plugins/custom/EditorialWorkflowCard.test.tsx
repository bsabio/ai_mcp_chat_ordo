// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EditorialWorkflowCard } from "./EditorialWorkflowCard";
import type { ToolPluginProps } from "../../registry/types";

function createPart(overrides: Partial<NonNullable<ToolPluginProps["part"]>> = {}) {
  return {
    type: "job_status" as const,
    jobId: "job_editorial_1",
    toolName: "draft_content",
    label: "Draft Content",
    status: "succeeded" as const,
    ...overrides,
  };
}

describe("EditorialWorkflowCard", () => {
  it("renders a structured draft-content result and preserves action links", () => {
    const onActionClick = vi.fn();

    render(
      <EditorialWorkflowCard
        part={createPart({
          title: "AI Governance Playbook",
          summary: 'Draft journal article "AI Governance Playbook" ready at /journal/ai-governance-playbook.',
        })}
        toolCall={{
          name: "draft_content",
          args: {},
          result: {
            id: "post_1",
            slug: "ai-governance-playbook",
            status: "draft",
            title: "AI Governance Playbook",
            description: "Internal editorial draft.",
            createdAt: "2026-04-10T12:00:00.000Z",
          },
        }}
        computedActions={[
          {
            type: "action-link",
            label: "Publish",
            actionType: "send",
            value: "Publish the draft journal article with id post_1.",
          },
        ]}
        isStreaming={false}
        onActionClick={onActionClick}
      />,
    );

    expect(screen.getByRole("region", { name: "Draft Content result" })).toHaveAttribute(
      "data-capability-card",
      "true",
    );
    expect(screen.getByText("AI Governance Playbook")).toBeInTheDocument();
    expect(screen.getByText("/journal/ai-governance-playbook")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Publish (send)" }));
    expect(onActionClick).toHaveBeenCalledWith(
      "send",
      "Publish the draft journal article with id post_1.",
      undefined,
    );
  });

  it("renders editorial QA findings from the structured payload", () => {
    render(
      <EditorialWorkflowCard
        part={createPart({
          toolName: "qa_blog_article",
          label: "Qa Blog Article",
          title: "AI Governance Playbook",
        })}
        toolCall={{
          name: "qa_blog_article",
          args: {},
          result: {
            approved: false,
            summary: "Two issues still need revisions.",
            findings: [
              {
                id: "finding_1",
                severity: "high",
                issue: "Missing citations for the framework comparison.",
                recommendation: "Add citations for the governance framework claims.",
              },
            ],
          },
        }}
        isStreaming={false}
      />,
    );

    expect(screen.getByText("Needs revisions")).toBeInTheDocument();
    expect(screen.getByText("Missing citations for the framework comparison.")).toBeInTheDocument();
    expect(screen.getByText("Add citations for the governance framework claims.")).toBeInTheDocument();
  });

  it("renders generated hero-image results with a preview", () => {
    render(
      <EditorialWorkflowCard
        part={createPart({
          toolName: "generate_blog_image",
          label: "Generate Blog Image",
          title: "Founders in a strategy room",
        })}
        toolCall={{
          name: "generate_blog_image",
          args: {},
          result: {
            assetId: "asset_1",
            postSlug: "ai-governance-playbook",
            title: "AI Governance Playbook",
            imageUrl: "/api/blog/assets/asset_1",
            selectionState: "selected",
            visibility: "draft",
            width: 1536,
            height: 1024,
            summary: 'Generated hero image for "AI Governance Playbook" and linked it at /journal/ai-governance-playbook.',
          },
        }}
        isStreaming={false}
      />,
    );

    expect(screen.getByRole("img", { name: "Founders in a strategy room" })).toBeInTheDocument();
    expect(screen.getByText("asset_1")).toBeInTheDocument();
    expect(screen.getByText("/journal/ai-governance-playbook")).toBeInTheDocument();
    expect(screen.getByText("1536 x 1024")).toBeInTheDocument();
  });

  it("renders compose previews behind the shared disclosure", () => {
    render(
      <EditorialWorkflowCard
        part={createPart({
          toolName: "compose_blog_article",
          label: "Compose Blog Article",
        })}
        toolCall={{
          name: "compose_blog_article",
          args: {},
          result: {
            title: "AI Governance Playbook",
            description: "Executive editorial draft.",
            content: "This is the long-form draft content for the article.",
            summary: "Draft article prepared for review.",
          },
        }}
        isStreaming={false}
      />,
    );

    expect(screen.queryByText("This is the long-form draft content for the article.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Draft preview/i }));

    expect(screen.getByText("This is the long-form draft content for the article.")).toBeInTheDocument();
  });

  it("falls back when the payload is not compatible with the editorial card", () => {
    render(
      <EditorialWorkflowCard
        part={createPart({
          toolName: "compose_blog_article",
          label: "Compose Blog Article",
          status: "running",
          progressLabel: "Composing",
        })}
        toolCall={{
          name: "compose_blog_article",
          args: {},
          result: { ok: true },
        }}
        isStreaming={false}
      />,
    );

    expect(screen.getByText("Compose Blog Article")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
  });
});