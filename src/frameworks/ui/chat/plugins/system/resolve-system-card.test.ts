import { describe, expect, it } from "vitest";

import type { CapabilityPresentationDescriptor } from "@/core/entities/capability-presentation";

import { resolveSystemCardKind } from "./resolve-system-card";

const editorialDescriptor: CapabilityPresentationDescriptor = {
  toolName: "draft_content",
  family: "editorial",
  label: "Draft Content",
  cardKind: "editorial_workflow",
  executionMode: "deferred",
  progressMode: "single",
  historyMode: "payload_snapshot",
  defaultSurface: "conversation",
  artifactKinds: [],
  supportsRetry: "whole_job",
};

describe("resolveSystemCardKind", () => {
  it("routes failed and canceled job parts to the shared error card", () => {
    expect(
      resolveSystemCardKind({
        part: {
          type: "job_status",
          jobId: "job_failed_1",
          toolName: "generate_graph",
          label: "Generate Graph",
          status: "failed",
        },
      }),
    ).toBe("error");

    expect(
      resolveSystemCardKind({
        part: {
          type: "job_status",
          jobId: "job_canceled_1",
          toolName: "generate_audio",
          label: "Generate Audio",
          status: "canceled",
        },
      }),
    ).toBe("error");
  });

  it("keeps succeeded transcript snapshots without payload detail on the family card path", () => {
    expect(
      resolveSystemCardKind({
        descriptor: editorialDescriptor,
        part: {
          type: "job_status",
          jobId: "job_legacy_1",
          toolName: "draft_content",
          label: "Draft Content",
          status: "succeeded",
          summary: "Historical draft summary.",
        },
      }),
    ).toBeNull();
  });

  it("keeps native payload-backed transcript parts on their family card path", () => {
    expect(
      resolveSystemCardKind({
        descriptor: editorialDescriptor,
        part: {
          type: "job_status",
          jobId: "job_native_1",
          toolName: "draft_content",
          label: "Draft Content",
          status: "succeeded",
          resultPayload: {
            id: "post_1",
            slug: "ai-governance-playbook",
            status: "draft",
            title: "AI Governance Playbook",
          },
        },
      }),
    ).toBeNull();
  });
});
