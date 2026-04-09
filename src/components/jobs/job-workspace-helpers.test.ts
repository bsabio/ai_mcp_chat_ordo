import { describe, expect, it, vi } from "vitest";

import type { JobHistoryEntry } from "@/lib/jobs/job-event-history";
import type { JobStatusSnapshot } from "@/lib/jobs/job-read-model";

import {
  buildJobFailureClipboardText,
  buildJobLogExport,
  buildJobSummaryClipboardText,
  formatJobFailureClass,
  getJobArtifactLink,
  getJobLogExportFileName,
} from "@/components/jobs/job-workspace-helpers";

function makeSnapshot(
  overrides: Partial<JobStatusSnapshot["part"]> = {},
): JobStatusSnapshot {
  return {
    messageId: "jobmsg_job_1",
    conversationId: "conv_jobs",
    part: {
      type: "job_status",
      jobId: "job_1",
      toolName: "publish_content",
      label: "Publish Content",
      status: "succeeded",
      title: "Launch Plan",
      subtitle: "Publish the approved article",
      summary: 'Published journal article "Launch Plan" at /journal/launch-plan.',
      updatedAt: "2026-04-08T15:00:00.000Z",
      resultPayload: {
        slug: "launch-plan",
        title: "Launch Plan",
        status: "published",
      },
      failureClass: null,
      recoveryMode: "rerun",
      replayedFromJobId: null,
      supersededByJobId: null,
      ...overrides,
    },
  };
}

function makeHistoryEntry(overrides: Partial<JobHistoryEntry> = {}): JobHistoryEntry {
  return {
    id: "evt_1",
    jobId: "job_1",
    conversationId: "conv_jobs",
    sequence: 1,
    eventType: "result",
    createdAt: "2026-04-08T15:00:00.000Z",
    part: {
      type: "job_status",
      jobId: "job_1",
      toolName: "publish_content",
      label: "Publish Content",
      status: "succeeded",
      summary: 'Published journal article "Launch Plan" at /journal/launch-plan.',
    },
    ...overrides,
  };
}

describe("job workspace helpers", () => {
  it("resolves policy-driven artifact links for published and draft outputs", () => {
    expect(getJobArtifactLink(makeSnapshot())).toEqual({
      href: "/journal/launch-plan",
      label: "Open artifact",
    });

    expect(getJobArtifactLink(makeSnapshot({
      toolName: "draft_content",
      label: "Draft Content",
      resultPayload: { slug: "launch-plan", status: "draft" },
    }))).toEqual({
      href: "/admin/journal/preview/launch-plan",
      label: "Open artifact",
    });

    expect(getJobArtifactLink(makeSnapshot({
      toolName: "qa_blog_article",
      label: "QA Blog Article",
    }))).toBeNull();
  });

  it("builds copy-safe summary and failure text", () => {
    const summaryText = buildJobSummaryClipboardText(makeSnapshot({ replayedFromJobId: "job_0" }));
    expect(summaryText).toContain("Launch Plan");
    expect(summaryText).toContain("Replayed from: job_0");
    expect(summaryText).toContain("Summary:");

    const failureText = buildJobFailureClipboardText(makeSnapshot({
      status: "failed",
      error: "Provider offline",
      failureClass: "transient",
    }));
    expect(failureText).toContain("Failure class: Transient failure");
    expect(failureText).toContain("Failure: Provider offline");
    expect(buildJobFailureClipboardText(makeSnapshot())).toBeNull();
  });

  it("formats job failure classes for self-service detail", () => {
    expect(formatJobFailureClass("policy")).toBe("Policy blocked");
    expect(formatJobFailureClass(null)).toBeNull();
  });

  it("builds exported job log payloads and stable filenames", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T16:00:00.000Z"));

    const snapshot = makeSnapshot({
      replayedFromJobId: "job_0",
      supersededByJobId: "job_2",
    });
    const exportPayload = buildJobLogExport(snapshot, [makeHistoryEntry()]);

    expect(exportPayload).toEqual({
      version: 1,
      exportedAt: "2026-04-08T16:00:00.000Z",
      job: expect.objectContaining({
        jobId: "job_1",
        summary: 'Published journal article "Launch Plan" at /journal/launch-plan.',
        replayedFromJobId: "job_0",
        supersededByJobId: "job_2",
      }),
      history: [
        expect.objectContaining({
          sequence: 1,
          status: "succeeded",
        }),
      ],
    });
    expect(getJobLogExportFileName(snapshot)).toBe("launch-plan-job_1.json");

    vi.useRealTimers();
  });
});