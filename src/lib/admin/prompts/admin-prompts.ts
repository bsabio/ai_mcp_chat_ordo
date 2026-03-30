/**
 * D4.1 — System Prompt admin loaders.
 *
 * Provides list-of-slots and detail view models for the admin surface.
 */

import { getSystemPromptDataMapper } from "@/adapters/RepositoryFactory";
import type { SystemPrompt } from "@/core/use-cases/SystemPromptRepository";

// ── View-model types ───────────────────────────────────────────────────

export interface AdminPromptSlot {
  role: string;
  promptType: string;
  activeVersion: number | null;
  totalVersions: number;
  lastUpdated: string;
  updatedBy: string | null;
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
}

// ── Slot roles & types ─────────────────────────────────────────────────

const ROLES = ["ALL", "ANONYMOUS", "AUTHENTICATED", "STAFF", "ADMIN"] as const;
const PROMPT_TYPES = ["base", "role_directive"] as const;

// ── Loaders ────────────────────────────────────────────────────────────

export async function loadAdminPromptSlots(): Promise<AdminPromptSlot[]> {
  const mapper = getSystemPromptDataMapper();
  const slots: AdminPromptSlot[] = [];

  for (const role of ROLES) {
    for (const promptType of PROMPT_TYPES) {
      const versions = await mapper.listVersions(role, promptType);
      if (versions.length === 0) continue;

      const active = versions.find((v) => v.isActive);
      const latest = versions[0]; // listVersions returns DESC by version

      slots.push({
        role,
        promptType,
        activeVersion: active?.version ?? null,
        totalVersions: versions.length,
        lastUpdated: latest.createdAt,
        updatedBy: latest.createdBy,
      });
    }
  }

  return slots;
}

export async function loadAdminPromptDetail(
  role: string,
  promptType: string,
): Promise<AdminPromptDetailViewModel> {
  const mapper = getSystemPromptDataMapper();
  const all = await mapper.listVersions(role, promptType);

  const active = all.find((v) => v.isActive);

  const slot: AdminPromptSlot = {
    role,
    promptType,
    activeVersion: active?.version ?? null,
    totalVersions: all.length,
    lastUpdated: all[0]?.createdAt ?? "",
    updatedBy: all[0]?.createdBy ?? null,
  };

  const versions: AdminPromptVersionEntry[] = all.map((v: SystemPrompt) => ({
    version: v.version,
    isActive: v.isActive,
    createdAt: v.createdAt,
    createdBy: v.createdBy,
    notes: v.notes,
    contentPreview: v.content.slice(0, 200),
  }));

  return {
    slot,
    versions,
    activeContent: active?.content ?? "",
  };
}
