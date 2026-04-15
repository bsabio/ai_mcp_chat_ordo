/**
 * D4.1 — System Prompt admin loaders.
 *
 * Provides list-of-slots and detail view models for the admin surface.
 */

import { createPromptControlPlaneService } from "@/lib/prompts/prompt-control-plane-service";
import type {
  PromptControlPlaneService,
  PromptControlPlaneSlotSummary,
  PromptRuntimeCoverage,
} from "@/core/use-cases/PromptControlPlaneService";
import type { SystemPrompt } from "@/core/use-cases/SystemPromptRepository";

// ── View-model types ───────────────────────────────────────────────────

export interface AdminPromptSlot {
  role: string;
  promptType: string;
  activeVersion: number | null;
  totalVersions: number;
  lastUpdated: string;
  updatedBy: string | null;
  runtimeCoverage: PromptRuntimeCoverage;
}

export interface AdminPromptVersionEntry {
  version: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
  notes: string;
  contentPreview: string;
}

export interface AdminPromptDetailViewModel {
  slot: AdminPromptSlot;
  versions: AdminPromptVersionEntry[];
  activeContent: string;
  fallbackContent: string | null;
}

// ── Loaders ────────────────────────────────────────────────────────────

export async function loadAdminPromptSlots(
  service: PromptControlPlaneService = createPromptControlPlaneService(),
): Promise<AdminPromptSlot[]> {
  const slots = await service.listSlots();
  return slots.map(toAdminPromptSlot);
}

export async function loadAdminPromptDetail(
  role: string,
  promptType: string,
  service: PromptControlPlaneService = createPromptControlPlaneService(),
): Promise<AdminPromptDetailViewModel> {
  const detail = await service.getSlotDetail({
    role,
    promptType: promptType as "base" | "role_directive",
  });

  const versions: AdminPromptVersionEntry[] = detail.versions.map((v: SystemPrompt) => ({
    version: v.version,
    isActive: v.isActive,
    createdAt: v.createdAt,
    createdBy: v.createdBy,
    notes: v.notes,
    contentPreview: v.content.slice(0, 200),
  }));

  return {
    slot: toAdminPromptSlot(detail.slot),
    versions,
    activeContent: detail.activeContent,
    fallbackContent: detail.fallbackContent,
  };
}

function toAdminPromptSlot(slot: PromptControlPlaneSlotSummary): AdminPromptSlot {
  return {
    role: slot.role,
    promptType: slot.promptType,
    activeVersion: slot.activeVersion,
    totalVersions: slot.totalVersions,
    lastUpdated: slot.lastUpdated,
    updatedBy: slot.updatedBy,
    runtimeCoverage: slot.runtimeCoverage,
  };
}
