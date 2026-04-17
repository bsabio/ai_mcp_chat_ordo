import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MediaRenderCard } from "./MediaRenderCard";
import type { CapabilityResultEnvelope } from "@/core/entities/capability-result";

function makeEnvelope(overrides: Partial<CapabilityResultEnvelope> = {}): CapabilityResultEnvelope {
  return {
    schemaVersion: 1,
    toolName: "compose_media",
    family: "artifact",
    cardKind: "artifact_viewer",
    executionMode: "hybrid",
    inputSnapshot: { planId: "plan-1" },
    summary: { title: "Media Composition", statusLine: "succeeded" },
    payload: { route: "browser_wasm", planId: "plan-1", primaryAssetId: "asset-abc", outputFormat: "mp4" },
    ...overrides,
  };
}

describe("MediaRenderCard", () => {
  it("renders the title from the envelope summary", () => {
    render(<MediaRenderCard envelope={makeEnvelope()} />);
    expect(screen.getByText("Media Composition")).toBeInTheDocument();
  });

  it("shows WASM route label for browser executionMode", () => {
    render(<MediaRenderCard envelope={makeEnvelope({ executionMode: "browser" })} />);
    expect(screen.getByText("WASM")).toBeInTheDocument();
  });

  it("shows SERVER route label for deferred executionMode", () => {
    render(<MediaRenderCard envelope={makeEnvelope({ executionMode: "deferred" })} />);
    expect(screen.getByText("SERVER")).toBeInTheDocument();
  });

  it("shows HYBRID label for hybrid executionMode", () => {
    render(<MediaRenderCard envelope={makeEnvelope({ executionMode: "hybrid" })} />);
    expect(screen.getByText("HYBRID")).toBeInTheDocument();
  });

  it("renders a video element when a video artifact with URI is present", () => {
    const envelope = makeEnvelope({
      inputSnapshot: { planId: "plan-1", resolution: { width: 1080, height: 1920 } },
      artifacts: [
        {
          kind: "video",
          label: "Composed Video",
          mimeType: "video/mp4",
          assetId: "asset-abc",
          uri: "/api/user-files/asset-abc",
          retentionClass: "conversation",
          source: "generated",
        },
      ],
    });
    render(<MediaRenderCard envelope={envelope} />);
    // Video elements don't have an implicit ARIA role of 'region' — query directly
    const video = document.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.getAttribute("src")).toBe("/api/user-files/asset-abc");
    expect(video?.style.aspectRatio).toBe("1080 / 1920");
    expect(screen.getByText("1080x1920 · Portrait")).toBeInTheDocument();
  });

  it("keeps playback controls hidden until the browser reports that the video can play", () => {
    const envelope = makeEnvelope({
      artifacts: [
        {
          kind: "video",
          label: "Composed Video",
          mimeType: "video/mp4",
          assetId: "asset-preview-1",
          uri: "/api/user-files/asset-preview-1",
          retentionClass: "conversation",
          source: "generated",
        },
      ],
      progress: { percent: 98, label: "Verifying playback" },
    });

    render(<MediaRenderCard envelope={envelope} />);
    const video = document.querySelector("video") as HTMLVideoElement | null;
    expect(video).not.toBeNull();
    expect(video?.controls).toBe(false);
    expect(screen.getByText("Verifying playback")).toBeInTheDocument();

    if (video) {
      fireEvent.canPlay(video);
    }

    expect(video?.controls).toBe(true);
    expect(screen.queryByText("Verifying playback")).not.toBeInTheDocument();
  });

  it("renders failure state with status message when statusLine is failed", () => {
    const envelope = makeEnvelope({
      summary: { title: "Media Composition", statusLine: "failed", message: "transcoding error" },
    });
    render(<MediaRenderCard envelope={envelope} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Media Composition Failed")).toBeInTheDocument();
    expect(screen.getByText("transcoding error")).toBeInTheDocument();
  });

  it("renders honest degraded state with no video when artifacts are absent", () => {
    const envelope = makeEnvelope({ artifacts: [] });
    render(<MediaRenderCard envelope={envelope} />);
    // No video element — just the progress placeholder
    expect(document.querySelector("video")).toBeNull();
    expect(screen.getByLabelText("Media render result")).toBeInTheDocument();
  });

  it("renders the same structure for browser-path and server-path envelopes", () => {
    const browserEnvelope = makeEnvelope({ executionMode: "browser" });
    const serverEnvelope = makeEnvelope({ executionMode: "deferred" });

    const { container: browserContainer } = render(<MediaRenderCard envelope={browserEnvelope} />);
    const { container: serverContainer } = render(<MediaRenderCard envelope={serverEnvelope} />);

    // Both should have the same outer aria-label (same card structure)
    expect(browserContainer.querySelector("[aria-label='Media render result']")).toBeInTheDocument();
    expect(serverContainer.querySelector("[aria-label='Media render result']")).toBeInTheDocument();
  });

  it("shows the asset ID footer when a video artifact has an assetId", () => {
    const envelope = makeEnvelope({
      artifacts: [
        {
          kind: "video",
          label: "Test Output",
          mimeType: "video/mp4",
          assetId: "my-asset-123",
          retentionClass: "conversation",
          source: "generated",
        },
      ],
    });
    render(<MediaRenderCard envelope={envelope} />);
    expect(screen.getByText(/my-asset-123/)).toBeInTheDocument();
  });

  it("uses landscape sizing metadata when the output was explicitly overridden", () => {
    const envelope = makeEnvelope({
      replaySnapshot: { route: "browser_wasm", resolution: { width: 1920, height: 1080 } },
      artifacts: [
        {
          kind: "video",
          label: "Landscape Output",
          mimeType: "video/mp4",
          uri: "/api/user-files/asset-landscape",
          retentionClass: "conversation",
          source: "generated",
        },
      ],
    });
    render(<MediaRenderCard envelope={envelope} />);
    expect(screen.getByText("1920x1080 · Landscape")).toBeInTheDocument();
    const video = document.querySelector("video");
    expect(video?.style.aspectRatio).toBe("1920 / 1080");
  });
});
