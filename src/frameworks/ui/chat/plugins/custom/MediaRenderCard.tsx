import React from "react";
import type { CapabilityResultEnvelope, CapabilityArtifactRef } from "@/core/entities/capability-result";

interface MediaRenderCardProps {
  envelope: CapabilityResultEnvelope;
}

function RouteLabel({ mode }: { mode: CapabilityResultEnvelope["executionMode"] }) {
  const label = mode === "browser" ? "WASM" : mode === "hybrid" ? "HYBRID" : "SERVER";
  const style =
    mode === "browser" || mode === "hybrid"
      ? "bg-brand/10 text-brand"
      : "bg-surface-muted text-text-secondary";
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${style}`}>
      {label}
    </span>
  );
}

function ArtifactRow({ artifact }: { artifact: CapabilityArtifactRef }) {
  const label = artifact.label || artifact.kind;
  const href = artifact.uri ?? (artifact.assetId ? `/api/user-files/${artifact.assetId}` : null);

  if (artifact.kind === "video" && href) {
    return (
      <div className="mt-2">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          controls
          src={href}
          className="w-full rounded-lg max-h-64 bg-black/80"
          preload="metadata"
          aria-label={label}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mt-1 text-[11px]">
      <span className="text-text-secondary truncate pr-4">{label}</span>
      {href && (
        <a
          href={href}
          download
          className="text-brand hover:underline whitespace-nowrap"
          aria-label={`Download ${label}`}
        >
          Download
        </a>
      )}
    </div>
  );
}

export function MediaRenderCard({ envelope }: MediaRenderCardProps) {
  const isTerminalFailure =
    envelope.summary.statusLine === "failed" ||
    envelope.summary.statusLine === "canceled";

  if (isTerminalFailure) {
    return (
      <div
        className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl"
        role="alert"
        aria-label="Media composition failed"
      >
        <h4 className="text-red-600 font-semibold text-sm">Media Composition Failed</h4>
        <p className="text-xs text-red-500 mt-1">
          {envelope.summary.message ?? envelope.summary.statusLine ?? "An error occurred."}
        </p>
        {envelope.replaySnapshot?.route != null && (
          <p className="text-[10px] text-red-400 mt-0.5">
            Route: {String(envelope.replaySnapshot.route)}
          </p>
        )}
      </div>
    );
  }

  const artifacts = envelope.artifacts ?? [];
  const primaryVideo = artifacts.find((a) => a.kind === "video");
  const auxiliaryArtifacts = artifacts.filter((a) => a.kind !== "video");

  return (
    <div
      className="bg-surface-elevated border border-border/50 rounded-xl overflow-hidden pt-4 px-4 pb-3 w-full max-w-sm flex flex-col gap-2"
      aria-label="Media render result"
    >
      {/* Header */}
      <div className="flex items-center justify-between opacity-80">
        <span className="text-xs uppercase tracking-wider font-semibold">
          {envelope.summary.title ?? "Render Result"}
        </span>
        <RouteLabel mode={envelope.executionMode} />
      </div>

      {/* Subtitle / status line */}
      {envelope.summary.subtitle && (
        <p className="text-[11px] text-text-secondary">{envelope.summary.subtitle}</p>
      )}

      {/* Primary video output */}
      {primaryVideo ? (
        <ArtifactRow artifact={primaryVideo} />
      ) : (
        /* Placeholder when artifact not yet available (in-progress or pruned) */
        <div className="aspect-video bg-black/80 rounded-lg flex items-center justify-center relative overflow-hidden group">
          <span className="text-white/30 text-xs tracking-widest uppercase z-10 font-bold group-hover:scale-110 transition-transform duration-300">
            {envelope.progress?.label ?? "Processing…"}
          </span>
          <div className="absolute inset-0 bg-gradient-to-t from-brand/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Auxiliary artifacts (subtitle, waveform, etc.) */}
      {auxiliaryArtifacts.length > 0 && (
        <div className="border-t border-border/30 pt-2 flex flex-col gap-1">
          {auxiliaryArtifacts.map((artifact, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable render order
            <ArtifactRow key={i} artifact={artifact} />
          ))}
        </div>
      )}

      {/* Footer: asset ID for debugging / honest history */}
      {primaryVideo?.assetId && (
        <p className="text-[10px] text-text-secondary/50 mt-0.5 truncate">
          ID: {primaryVideo.assetId}
        </p>
      )}
    </div>
  );
}
