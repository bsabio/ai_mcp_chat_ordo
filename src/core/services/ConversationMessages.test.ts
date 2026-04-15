import { describe, expect, it } from "vitest";

import type { ChatMessage } from "@/core/entities/chat-message";

import { upsertJobStatusMessage } from "./ConversationMessages";

describe("ConversationMessages", () => {
  it("lets newer terminal job updates clear stale progress fields", () => {
    const initialState: ChatMessage[] = [
      {
        id: "jobmsg_job_1",
        role: "assistant",
        content: "",
        timestamp: new Date("2026-04-14T18:00:00.000Z"),
        parts: [
          {
            type: "job_status",
            jobId: "job_1",
            toolName: "produce_blog_article",
            label: "Produce Blog Article",
            status: "running",
            sequence: 4,
            progressPercent: 50,
            progressLabel: "Resolving QA findings",
            resultEnvelope: {
              schemaVersion: 1,
              toolName: "produce_blog_article",
              family: "editorial",
              cardKind: "editorial_workflow",
              executionMode: "deferred",
              inputSnapshot: { brief: "Launch Plan" },
              summary: { title: "Launch Plan" },
              progress: {
                percent: 50,
                label: "Resolving QA findings",
                phases: [
                  { key: "resolve_blog_article_qa", label: "Resolving QA findings", status: "active", percent: 50 },
                ],
                activePhaseKey: "resolve_blog_article_qa",
              },
              payload: null,
            },
          },
        ],
      },
    ];

    const nextState = upsertJobStatusMessage(initialState, {
      type: "job_status",
      jobId: "job_1",
      toolName: "produce_blog_article",
      label: "Produce Blog Article",
      status: "failed",
      sequence: 5,
      progressPercent: null,
      progressLabel: null,
      error: "Request timed out.",
      resultEnvelope: null,
      updatedAt: "2026-04-14T18:01:00.000Z",
    });

    expect(nextState[0]?.parts?.[0]).toMatchObject({
      type: "job_status",
      status: "failed",
      progressPercent: null,
      progressLabel: null,
      resultEnvelope: null,
      error: "Request timed out.",
    });
  });
});