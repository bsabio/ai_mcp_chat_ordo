// @vitest-environment jsdom

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { chatMessageViewportSpy } = vi.hoisted(() => ({
  chatMessageViewportSpy: vi.fn(),
}));

vi.mock("./ChatInput", () => ({
  ChatInput: () => <div data-testid="chat-input" />,
}));

vi.mock("./chat/plugins/system/ChatProgressStrip", () => ({
  ChatProgressStrip: ({ items }: { items: Array<{ jobId: string }> }) => (
    <div data-testid="chat-progress-strip">{items.map((item) => item.jobId).join(",")}</div>
  ),
}));

vi.mock("./ChatMessageViewport", async () => {
  const React = await import("react");
  const { useToolPluginRegistry } = await import("./chat/registry/ToolPluginContext");
  const { createDefaultToolRegistry } = await import("./chat/registry/default-tool-registry");

  const expectedRenderer = createDefaultToolRegistry().getRenderer("generate_graph");

  const ViewportProbe = (props: { "data-renderer"?: string }) => {
    chatMessageViewportSpy(props);
    const registry = useToolPluginRegistry();
    const renderer = registry.getRenderer("generate_graph");

    return React.createElement(
      "div",
      {
        "data-testid": "tool-registry-probe",
        "data-renderer": renderer === expectedRenderer ? "custom" : "fallback",
      },
      renderer === expectedRenderer ? "custom" : "fallback",
    );
  };

  return {
    ChatMessageViewport: ViewportProbe,
    MemoizedChatMessageViewport: React.memo(ViewportProbe),
  };
});

import { ChatContentSurface } from "./ChatContentSurface";
import type { ResolvedProgressStripItem } from "./chat/plugins/system/resolve-progress-strip";

function buildProgressItem(jobId: string): ResolvedProgressStripItem {
  return {
    jobId,
    toolName: "produce_blog_article",
    label: "Produce Blog Article",
    title: "AI Governance Playbook",
    subtitle: null,
    summary: null,
    status: "running",
    bubbleStatus: "active",
    statusText: "Running 42%",
    phaseLabel: "Reviewing article",
    progressPercent: 42,
    updatedAt: "2026-04-08T12:00:00.000Z",
    descriptor: {
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
    },
    canRetryWholeJob: false,
  };
}

function buildProps() {
  return {
    activeTrigger: null,
    canSend: true,
    canStopStream: false,
    dynamicSuggestions: [],
    input: "",
    inputRef: { current: null },
    isEmbedded: true,
    isFullScreen: false,
    isHeroState: false,
    isLoadingMessages: false,
    isSending: false,
    mentionIndex: 0,
    messages: [],
    onFileDrop: vi.fn(),
    onFileRemove: vi.fn(),
    onFileSelect: vi.fn(),
    onInputChange: vi.fn(),
    onLinkClick: vi.fn(),
    onMentionIndexChange: vi.fn(),
    onSend: vi.fn(),
    onSuggestionClick: vi.fn(),
    onSuggestionSelect: vi.fn(),
    pendingFiles: [],
    progressStripItems: [] as ResolvedProgressStripItem[],
    scrollDependency: 0,
    searchQuery: "",
    suggestions: [],
  };
}

describe("ChatContentSurface", () => {
  it("provides the default tool registry to the message viewport", () => {
    render(<ChatContentSurface {...buildProps()} />);

    expect(screen.getByTestId("tool-registry-probe")).toHaveAttribute("data-renderer", "custom");
  });

  it("does not rerender the transcript when only progress strip items change", () => {
    chatMessageViewportSpy.mockClear();
    const props = buildProps();
    const { rerender } = render(<ChatContentSurface {...props} />);

    expect(chatMessageViewportSpy).toHaveBeenCalledTimes(1);

    rerender(
      <ChatContentSurface
        {...props}
        progressStripItems={[buildProgressItem("job_running_1")]}
      />,
    );

    expect(chatMessageViewportSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("chat-progress-strip")).toHaveTextContent("job_running_1");
  });
});