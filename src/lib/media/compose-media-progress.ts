import type { JobProgressPhaseDefinition } from "@/lib/jobs/job-capability-types";

export const COMPOSE_MEDIA_PROGRESS_PHASES = [
  { key: "staging_assets", label: "Staging assets", baselinePercent: 5 },
  { key: "rendering_media", label: "Rendering media", baselinePercent: 20 },
  { key: "packaging_artifacts", label: "Packaging artifacts", baselinePercent: 85 },
  { key: "persisting", label: "Persisting output", baselinePercent: 95 },
] as const satisfies readonly JobProgressPhaseDefinition[];

export type ComposeMediaProgressPhaseKey = typeof COMPOSE_MEDIA_PROGRESS_PHASES[number]["key"];

export const COMPOSE_MEDIA_COMPLETE_LABEL = "Composition complete";
export const COMPOSE_MEDIA_REROUTING_LABEL = "Rerouting to server";
export const COMPOSE_MEDIA_FAILURE_LABEL = "Failed";
export const COMPOSE_MEDIA_ARTIFACT_LABEL = "Composed Video";

const COMPOSE_MEDIA_PHASES_BY_KEY = new Map(
  COMPOSE_MEDIA_PROGRESS_PHASES.map((phase) => [phase.key, phase] as const),
);

export function getComposeMediaProgressPhase(
  key: ComposeMediaProgressPhaseKey,
): (typeof COMPOSE_MEDIA_PROGRESS_PHASES)[number] {
  const phase = COMPOSE_MEDIA_PHASES_BY_KEY.get(key);
  if (!phase) {
    throw new Error(`Unknown compose_media progress phase: ${key}`);
  }

  return phase;
}

export function getComposeMediaProgressLabel(key: ComposeMediaProgressPhaseKey): string {
  return getComposeMediaProgressPhase(key).label;
}

export function getComposeMediaBaselinePercent(key: ComposeMediaProgressPhaseKey): number {
  return getComposeMediaProgressPhase(key).baselinePercent;
}
