import { describe, expect, it } from "vitest";

import type { Conversation, Message } from "@/core/entities/conversation";
import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";
import {
  CONVERSATION_EXPORT_VERSION,
  buildTranscriptCopy,
  buildConversationExportPayload,
  parseConversationImportPayload,
} from "@/lib/chat/conversation-portability";

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "conv_1",
    userId: "usr_1",
    title: "Compacted thread",
    status: "archived",
    createdAt: "2026-04-09T10:00:00.000Z",
    updatedAt: "2026-04-09T10:05:00.000Z",
    convertedFrom: null,
    messageCount: 2,
    firstMessageAt: "2026-04-09T10:00:00.000Z",
    lastToolUsed: null,
    sessionSource: "authenticated",
    promptVersion: null,
    routingSnapshot: createConversationRoutingSnapshot(),
    referralSource: null,
    ...overrides,
  };
}

function makeMessage(overrides: Partial<Message> = {}, index = 0): Message {
  return {
    id: `msg_${index}`,
    conversationId: "conv_1",
    role: "user",
    content: `Message ${index}`,
    parts: [{ type: "text", text: `Message ${index}` }],
    createdAt: new Date(2026, 3, 9, 10, index).toISOString(),
    tokenEstimate: 4,
    ...overrides,
  };
}

describe("conversation portability transcript durability", () => {
  it("exports an explicit transcript view with compaction markers", () => {
    const payload = buildConversationExportPayload({
      conversation: makeConversation(),
      messages: [
        makeMessage({ role: "user", content: "Original question" }, 0),
        makeMessage(
          {
            id: "msg_summary_1",
            role: "system",
            content: "Summary of earlier discussion.",
            parts: [
              { type: "summary", text: "Summary of earlier discussion.", coversUpToMessageId: "msg_0" },
              {
                type: "compaction_marker",
                kind: "summary",
                compactedCount: 1,
                coversUpToMessageId: "msg_0",
              },
            ],
          },
          1,
        ),
      ],
      exportedAt: "2026-04-09T12:00:00.000Z",
    });

    expect(payload.transcript).toBeDefined();
    expect(payload.transcript?.map((entry) => entry.role)).toEqual([
      "user",
      "system",
      "compaction_marker",
    ]);
    expect(payload.transcript?.at(-1)).toMatchObject({
      role: "compaction_marker",
      compactionKind: "summary",
      compactedCount: 1,
      coversUpToMessageId: "msg_0",
      sourceMessageId: "msg_summary_1",
    });
  });

  it("preserves compaction marker parts when importing a platform export payload", () => {
    const result = parseConversationImportPayload(JSON.stringify({
      version: CONVERSATION_EXPORT_VERSION,
      exportedAt: "2026-04-09T12:00:00.000Z",
      conversation: {
        id: "conv_source",
        title: "Imported compacted thread",
        status: "archived",
        createdAt: "2026-04-09T10:00:00.000Z",
        updatedAt: "2026-04-09T10:05:00.000Z",
        messageCount: 1,
        sessionSource: "authenticated",
        promptVersion: null,
        routingSnapshot: { lane: "organization", confidence: 0.8 },
        referralSource: null,
      },
      messages: [
        {
          id: "msg_summary_1",
          role: "system",
          content: "Summary of earlier discussion.",
          parts: [
            { type: "summary", text: "Summary of earlier discussion.", coversUpToMessageId: "msg_0" },
            {
              type: "compaction_marker",
              kind: "summary",
              compactedCount: 3,
              coversUpToMessageId: "msg_0",
            },
          ],
          createdAt: "2026-04-09T10:05:00.000Z",
          tokenEstimate: 12,
          attachmentManifestIds: [],
        },
      ],
      attachmentManifest: [],
      jobReferences: [],
      transcript: [
        {
          turnIndex: 0,
          timestamp: "2026-04-09T10:05:00.000Z",
          role: "system",
          contentSummary: "Summary of earlier discussion.",
          contentHash: "hash-1",
          tokenEstimate: 12,
          inContextWindow: false,
          sourceMessageId: "msg_summary_1",
        },
      ],
    }));

    expect(result.importedMessages).toEqual([
      {
        role: "system",
        content: "Summary of earlier discussion.",
        parts: [
          { type: "summary", text: "Summary of earlier discussion.", coversUpToMessageId: "msg_0" },
          {
            type: "compaction_marker",
            kind: "summary",
            compactedCount: 3,
            coversUpToMessageId: "msg_0",
          },
        ],
      },
    ]);
  });

  it("round-trips normalized job envelopes and active phase transcript copy", () => {
    const payload = buildConversationExportPayload({
      conversation: makeConversation(),
      messages: [
        makeMessage(
          {
            id: "msg_job_1",
            role: "assistant",
            content: "",
            parts: [
              {
                type: "job_status",
                jobId: "job_1",
                toolName: "produce_blog_article",
                label: "Produce Blog Article",
                title: "Launch Plan",
                status: "running",
                sequence: 8,
                progressPercent: 42,
                progressLabel: "Reviewing article",
                resultEnvelope: {
                  schemaVersion: 1,
                  toolName: "produce_blog_article",
                  family: "editorial",
                  cardKind: "editorial_workflow",
                  executionMode: "deferred",
                  inputSnapshot: { brief: "Launch Plan" },
                  summary: { title: "Launch Plan" },
                  replaySnapshot: { brief: "Launch Plan", checkpoint: "qa" },
                  progress: {
                    percent: 42,
                    label: "Reviewing article",
                    phases: [
                      { key: "qa_blog_article", label: "Reviewing article", status: "active", percent: 60 },
                    ],
                    activePhaseKey: "qa_blog_article",
                  },
                  payload: null,
                },
                recoveryMode: "rerun",
                replayedFromJobId: "job_prior",
              },
            ],
          },
          1,
        ),
      ],
      exportedAt: "2026-04-09T12:00:00.000Z",
    });

    const imported = parseConversationImportPayload(JSON.stringify(payload));
    const transcript = buildTranscriptCopy([
      {
        role: "assistant",
        content: "",
        parts: imported.importedMessages[0]?.parts,
        timestamp: new Date("2026-04-09T12:00:00.000Z"),
      },
    ]);

    expect(imported.importedMessages[0]?.parts[0]).toMatchObject({
      type: "job_status",
      resultEnvelope: expect.objectContaining({ toolName: "produce_blog_article" }),
      replayedFromJobId: "job_prior",
    });
    expect(transcript).toContain("Reviewing article (42%)");
  });

  it("preserves typed media attachment descriptors through export and import", () => {
    const payload = buildConversationExportPayload({
      conversation: makeConversation(),
      messages: [
        makeMessage(
          {
            id: "msg_media_1",
            role: "assistant",
            content: "",
            parts: [
              {
                type: "attachment",
                assetId: "uf_audio_1",
                fileName: "intro.mp3",
                mimeType: "audio/mpeg",
                fileSize: 4096,
                assetKind: "audio",
                durationSeconds: 91,
                source: "generated",
                retentionClass: "conversation",
                toolName: "generate_audio",
              },
            ],
          },
          1,
        ),
      ],
    });

    const imported = parseConversationImportPayload(JSON.stringify(payload));

    expect(imported.importedMessages[0]?.parts).toEqual([
      {
        type: "attachment",
        assetId: "uf_audio_1",
        fileName: "intro.mp3",
        mimeType: "audio/mpeg",
        fileSize: 4096,
        assetKind: "audio",
        durationSeconds: 91,
        source: "generated",
        retentionClass: "conversation",
        toolName: "generate_audio",
      },
    ]);
  });
});