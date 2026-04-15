// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CapabilityPresentationDescriptor } from "@/core/entities/capability-presentation";

import { ChatProgressStrip } from "./ChatProgressStrip";
import type { ResolvedProgressStripItem } from "./resolve-progress-strip";

const descriptor: CapabilityPresentationDescriptor = {
  toolName: "produce_blog_article",
  family: "editorial",
  label: "Produce Blog Article",
  cardKind: "editorial_workflow",
  executionMode: "deferred",
  progressMode: "phased",
  historyMode: "payload_snapshot",
  defaultSurface: "conversation",
  artifactKinds: [],
  supportsRetry: "whole_job",
};

function makeItem(
  jobId: string,
  overrides: Partial<ResolvedProgressStripItem> = {},
): ResolvedProgressStripItem {
  return {
    jobId,
    toolName: overrides.toolName ?? descriptor.toolName,
    label: overrides.label ?? descriptor.label,
    title: overrides.title ?? "AI Governance Playbook",
    subtitle: overrides.subtitle ?? "Queued from the default worker runtime",
    summary: overrides.summary ?? "Produce Blog Article is still running.",
    status: overrides.status ?? "running",
    bubbleStatus: overrides.bubbleStatus ?? "active",
    statusText: overrides.statusText ?? "Reviewing article 42%",
    phaseLabel: overrides.phaseLabel ?? "Reviewing article",
    progressPercent: overrides.progressPercent ?? 42,
    updatedAt: overrides.updatedAt ?? "2026-04-08T12:00:00.000Z",
    descriptor: overrides.descriptor ?? descriptor,
    canRetryWholeJob: overrides.canRetryWholeJob ?? false,
  };
}

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe("ChatProgressStrip", () => {
  it("hides the strip when there are no eligible jobs", () => {
    const { container } = render(<ChatProgressStrip items={[]} onActionClick={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("opens item details and routes whole-job retry through the existing action path", () => {
    const onActionClick = vi.fn();

    render(
      <ChatProgressStrip
        items={[
          makeItem("job_failed", {
            label: "Publish Content",
            status: "failed",
            bubbleStatus: "failed",
            statusText: "Needs attention",
            summary: "Publishing needs another run.",
            canRetryWholeJob: true,
            descriptor: {
              ...descriptor,
              toolName: "publish_content",
              label: "Publish Content",
            },
          }),
        ]}
        onActionClick={onActionClick}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Publish Content: Needs attention" }));

    expect(screen.getByRole("dialog", { name: "Publish Content progress details" })).toBeInTheDocument();
    expect(screen.getByText("Publishing needs another run.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry whole job" }));

    expect(onActionClick).toHaveBeenCalledWith("job", "job_failed", { operation: "retry" });
  });

  it("collapses overflow behind a readable control on mobile widths", () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <ChatProgressStrip
        items={[
          makeItem("job_failed", { label: "Publish Content", status: "failed", bubbleStatus: "failed", statusText: "Needs attention" }),
          makeItem("job_running_new", { label: "Draft Content", statusText: "Reviewing article 42%" }),
          makeItem("job_running_old", { label: "Generate Image", statusText: "Rendering 20%" }),
          makeItem("job_queued", { label: "QA Article", status: "queued", bubbleStatus: "pending", statusText: "Queued" }),
        ]}
        onActionClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Publish Content: Needs attention" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Draft Content: Reviewing article 42%" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate Image: Rendering 20%" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More active work (2)" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More active work (2)" }));

    expect(screen.getByRole("dialog", { name: "More active work" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Image Rendering 20%" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "QA Article Queued" })).toBeInTheDocument();
  });

  it("closes an open panel when the selected job disappears", () => {
    const { rerender } = render(
      <ChatProgressStrip
        items={[makeItem("job_running")]} 
        onActionClick={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Produce Blog Article: Reviewing article 42%" }));
    expect(screen.getByRole("dialog", { name: "Produce Blog Article progress details" })).toBeInTheDocument();

    rerender(<ChatProgressStrip items={[]} onActionClick={vi.fn()} />);

    expect(screen.queryByRole("dialog", { name: "Produce Blog Article progress details" })).not.toBeInTheDocument();
  });
});