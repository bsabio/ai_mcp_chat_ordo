import { describe, expect, it } from "vitest";

import {
  normalizeMediaRuntimeState,
  normalizePersistedMediaRuntimeState,
} from "./media-runtime-normalization";

describe("media runtime normalization", () => {
  it("maps pending browser-generated audio into a non-terminal generation phase", () => {
    const state = normalizeMediaRuntimeState({
      toolName: "generate_audio",
      jobStatus: "running",
      browserExecutionStatus: "running",
      payload: {
        action: "generate_audio",
        title: "Greeting",
        text: "Hello",
        assetId: null,
        provider: "openai-speech",
        generationStatus: "client_fetch_pending",
        estimatedDurationSeconds: 2,
        estimatedGenerationSeconds: 1,
      },
    });

    expect(state).toMatchObject({
      lifecyclePhase: "pending_local_generation",
      browserExecutionStatus: "running",
      hasDurableAsset: false,
      isTerminal: false,
      failureClass: null,
    });
  });

  it("maps durable compose success into a terminal compose_succeeded phase", () => {
    const state = normalizeMediaRuntimeState({
      toolName: "compose_media",
      jobStatus: "succeeded",
      browserExecutionStatus: "succeeded",
      payload: {
        action: "compose_media",
        primaryAssetId: "uf_video_1",
        outputFormat: "mp4",
      },
    });

    expect(state).toMatchObject({
      lifecyclePhase: "compose_succeeded",
      hasDurableAsset: true,
      isTerminal: true,
      failureClass: null,
      recoveryMode: null,
    });
  });

  it("maps browser fallback into a rerunnable compose fallback phase", () => {
    const state = normalizeMediaRuntimeState({
      toolName: "compose_media",
      jobStatus: "failed",
      browserExecutionStatus: "fallback_required",
      failureCode: "wasm_unavailable",
      payload: {
        action: "compose_media",
        id: "plan_1",
        outputFormat: "mp4",
      },
    });

    expect(state).toMatchObject({
      lifecyclePhase: "compose_fallback_required",
      failureCode: "wasm_unavailable",
      failureClass: "transient",
      recoveryMode: "rerun",
      failureStage: "local_execution",
    });
  });

  it("maps persisted local work into explicit local compose phases without implying success", () => {
    const state = normalizePersistedMediaRuntimeState({
      toolName: "compose_media",
      persistedStatus: "queued",
      payload: {
        action: "compose_media",
        id: "plan_queued_1",
      },
    });

    expect(state).toMatchObject({
      lifecyclePhase: "compose_queued_local",
      persistedStatus: "queued",
      hasDurableAsset: false,
      isTerminal: false,
    });
  });

  it("maps deferred compose queue and running states into deferred lifecycle phases", () => {
    const queuedState = normalizeMediaRuntimeState({
      toolName: "compose_media",
      jobStatus: "queued",
      executionMode: "deferred",
      recoveryMode: "rerun",
      payload: {
        plan: { id: "plan_deferred_1" },
      },
    });
    const runningState = normalizeMediaRuntimeState({
      toolName: "compose_media",
      jobStatus: "running",
      executionMode: "deferred",
      recoveryMode: "rerun",
      payload: {
        plan: { id: "plan_deferred_1" },
      },
    });

    expect(queuedState).toMatchObject({
      lifecyclePhase: "compose_queued_deferred",
      browserExecutionStatus: null,
      recoveryMode: "rerun",
    });
    expect(runningState).toMatchObject({
      lifecyclePhase: "compose_running_deferred",
      browserExecutionStatus: null,
      recoveryMode: "rerun",
    });
  });
});