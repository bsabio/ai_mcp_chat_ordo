import type Database from "better-sqlite3";

import { ConfigIdentitySource } from "@/adapters/ConfigIdentitySource";
import {
  getSystemPromptDataMapper,
  getConversationEventDataMapper,
} from "@/adapters/RepositoryFactory";
import { ROLE_DIRECTIVES } from "@/core/entities/role-directives";
import { ConversationEventRecorder } from "@/core/use-cases/ConversationEventRecorder";
import type {
  ActivatePromptVersionInput,
  CreatePromptVersionInput,
  PromptControlPlaneActivationResult,
  PromptControlPlaneCreateResult,
  PromptControlPlaneDiffResult,
  PromptControlPlaneService,
  PromptControlPlaneSideEffects,
  PromptControlPlaneSlotDetail,
  PromptControlPlaneSlotSummary,
  PromptSlotRef,
  PromptSlotType,
  PromptVersionChangedEvent,
} from "@/core/use-cases/PromptControlPlaneService";
import type { SystemPrompt, SystemPromptRepository } from "@/core/use-cases/SystemPromptRepository";
import { getDb } from "@/lib/db";
import { getAdminPromptDetailPath } from "@/lib/admin/prompts/admin-prompts-routes";
import {
  isPromptGovernedSlot,
  isPromptControlPlaneRole,
  isPromptRuntimeRole,
  isPromptSlotType,
  isRuntimeFallbackBackedSlot,
  listAllPromptSlots,
} from "@/lib/prompts/prompt-role-inventory";

interface PromptControlPlaneHooks {
  recordPromptVersionChanged?: (event: PromptVersionChangedEvent) => Promise<void>;
  revalidatePaths?: (paths: string[]) => Promise<void> | void;
}

interface PromptControlPlaneDeps {
  promptRepo: SystemPromptRepository;
  getFallbackBase: () => string;
  getFallbackDirective: (role: string) => string | null;
  hooks?: PromptControlPlaneHooks;
}

function assertPromptRole(role: string): void {
  if (!isPromptControlPlaneRole(role)) {
    throw new Error(`Unsupported prompt role: ${role}`);
  }
}

function assertPromptType(promptType: string): asserts promptType is PromptSlotType {
  if (!isPromptSlotType(promptType)) {
    throw new Error(`Unsupported prompt type: ${promptType}`);
  }
}

function assertPositiveVersion(version: number): void {
  if (!Number.isInteger(version) || version < 1) {
    throw new Error(`Invalid version number: ${version}`);
  }
}

function assertGovernedSlot(slot: PromptSlotRef): void {
  if (!isPromptGovernedSlot(slot)) {
    throw new Error(`Unsupported prompt slot: role=${slot.role}, type=${slot.promptType}`);
  }
}

function buildPromptRevalidationPaths(role: string, promptType: PromptSlotType): string[] {
  return ["/admin/prompts", getAdminPromptDetailPath(role, promptType)];
}

function summarizeSlot(
  slot: PromptSlotRef,
  versions: SystemPrompt[],
  fallbackContent: string | null,
): PromptControlPlaneSlotSummary {
  const active = versions.find((version) => version.isActive) ?? null;
  const latest = versions[0] ?? null;

  return {
    role: slot.role,
    promptType: slot.promptType,
    activeVersion: active?.version ?? null,
    totalVersions: versions.length,
    lastUpdated: latest?.createdAt ?? "",
    updatedBy: latest?.createdBy ?? null,
    runtimeCoverage: active ? "db" : fallbackContent ? "fallback" : "missing",
  };
}

function lineDiff(textA: string, textB: string): string {
  const linesA = textA.split("\n");
  const linesB = textB.split("\n");
  const lcs: number[][] = Array.from({ length: linesA.length + 1 }, () =>
    Array(linesB.length + 1).fill(0),
  );

  for (let row = 1; row <= linesA.length; row += 1) {
    for (let column = 1; column <= linesB.length; column += 1) {
      lcs[row][column] =
        linesA[row - 1] === linesB[column - 1]
          ? lcs[row - 1][column - 1] + 1
          : Math.max(lcs[row - 1][column], lcs[row][column - 1]);
    }
  }

  const diff: string[] = [];
  let row = linesA.length;
  let column = linesB.length;

  while (row > 0 || column > 0) {
    if (
      row > 0
      && column > 0
      && linesA[row - 1] === linesB[column - 1]
    ) {
      diff.push(`  ${linesA[row - 1]}`);
      row -= 1;
      column -= 1;
      continue;
    }

    if (column > 0 && (row === 0 || lcs[row][column - 1] >= lcs[row - 1][column])) {
      diff.push(`+ ${linesB[column - 1]}`);
      column -= 1;
      continue;
    }

    diff.push(`- ${linesA[row - 1]}`);
    row -= 1;
  }

  return diff.reverse().join("\n");
}

class DefaultPromptControlPlaneService implements PromptControlPlaneService {
  constructor(private readonly deps: PromptControlPlaneDeps) {}

  async listSlots(filter?: Partial<PromptSlotRef>): Promise<PromptControlPlaneSlotSummary[]> {
    const slots = this.resolveCandidateSlots(filter);
    const results: PromptControlPlaneSlotSummary[] = [];

    for (const slot of slots) {
      const versions = await this.deps.promptRepo.listVersions(slot.role, slot.promptType);
      const fallbackContent = this.getFallbackContent(slot);
      const summary = summarizeSlot(slot, versions, fallbackContent);

      if (versions.length > 0 || summary.runtimeCoverage !== "missing") {
        results.push(summary);
      }
    }

    return results;
  }

  async getSlotDetail(slot: PromptSlotRef): Promise<PromptControlPlaneSlotDetail> {
    const normalized = this.normalizeReadableSlot(slot);
    const versions = await this.deps.promptRepo.listVersions(normalized.role, normalized.promptType);
    const active = versions.find((version) => version.isActive) ?? null;
    const fallbackContent = this.getFallbackContent(normalized);

    return {
      slot: summarizeSlot(normalized, versions, fallbackContent),
      versions,
      activeContent: active?.content ?? fallbackContent ?? "",
      storedActiveContent: active?.content ?? null,
      fallbackContent,
    };
  }

  async createVersion(input: CreatePromptVersionInput): Promise<PromptControlPlaneCreateResult> {
    const slot = this.normalizeGovernedSlot(input);
    const content = input.content.trim();
    if (!content) {
      throw new Error("Prompt content must not be empty.");
    }

    const created = await this.deps.promptRepo.createVersion({
      role: slot.role,
      promptType: slot.promptType,
      content,
      createdBy: input.createdBy,
      notes: input.notes,
    });

    const detail = await this.getSlotDetail(slot);
    const sideEffects: PromptControlPlaneSideEffects = {
      revalidatePaths: buildPromptRevalidationPaths(slot.role, slot.promptType),
    };

    await this.applySideEffects(sideEffects);

    return {
      created,
      slot: detail.slot,
      sideEffects,
    };
  }

  async activateVersion(input: ActivatePromptVersionInput): Promise<PromptControlPlaneActivationResult> {
    const slot = this.normalizeGovernedSlot(input);
    assertPositiveVersion(input.version);

    const target = await this.deps.promptRepo.getByVersion(slot.role, slot.promptType, input.version);
    if (!target) {
      throw new Error(`Version ${input.version} not found for role=${slot.role}, type=${slot.promptType}`);
    }

    const current = await this.deps.promptRepo.getActive(slot.role, slot.promptType);
    await this.deps.promptRepo.activate(slot.role, slot.promptType, input.version);

    const detail = await this.getSlotDetail(slot);
    const promptVersionChanged = current?.version === target.version
      ? undefined
      : {
          type: "prompt_version_changed" as const,
          semantics: "slot_version" as const,
          role: slot.role,
          promptType: slot.promptType,
          oldVersion: current?.version ?? 0,
          newVersion: target.version,
        };

    const sideEffects: PromptControlPlaneSideEffects = {
      revalidatePaths: buildPromptRevalidationPaths(slot.role, slot.promptType),
      promptVersionChanged,
    };

    await this.applySideEffects(sideEffects);

    return {
      slot: detail.slot,
      activatedVersion: target.version,
      deactivatedVersion: current?.version ?? null,
      sideEffects,
    };
  }

  async rollback(input: ActivatePromptVersionInput): Promise<PromptControlPlaneActivationResult> {
    return this.activateVersion(input);
  }

  async diffVersions(input: {
    role: string;
    promptType: PromptSlotType;
    versionA: number;
    versionB: number;
  }): Promise<PromptControlPlaneDiffResult> {
    const slot = this.normalizeGovernedSlot(input);
    assertPositiveVersion(input.versionA);
    assertPositiveVersion(input.versionB);

    const versionA = await this.deps.promptRepo.getByVersion(slot.role, slot.promptType, input.versionA);
    const versionB = await this.deps.promptRepo.getByVersion(slot.role, slot.promptType, input.versionB);

    if (!versionA || !versionB) {
      throw new Error("One or both versions not found.");
    }

    return {
      role: slot.role,
      promptType: slot.promptType,
      versionA: input.versionA,
      versionB: input.versionB,
      diff: lineDiff(versionA.content, versionB.content),
    };
  }

  private normalizeReadableSlot(slot: PromptSlotRef): PromptSlotRef {
    assertPromptRole(slot.role);
    assertPromptType(slot.promptType);
    return {
      role: slot.role,
      promptType: slot.promptType,
    };
  }

  private normalizeGovernedSlot(slot: PromptSlotRef): PromptSlotRef {
    const normalized = this.normalizeReadableSlot(slot);
    assertGovernedSlot(normalized);
    return normalized;
  }

  private resolveCandidateSlots(filter?: Partial<PromptSlotRef>): PromptSlotRef[] {
    const role = filter?.role;
    const promptType = filter?.promptType;

    if (role) {
      assertPromptRole(role);
    }

    if (promptType) {
      assertPromptType(promptType);
    }

    if (role && promptType) {
      return [{ role, promptType }];
    }

    return listAllPromptSlots().filter((slot) => {
      if (role && slot.role !== role) {
        return false;
      }

      if (promptType && slot.promptType !== promptType) {
        return false;
      }

      return true;
    });
  }

  private getFallbackContent(slot: PromptSlotRef): string | null {
    if (!isRuntimeFallbackBackedSlot(slot)) {
      return null;
    }

    if (slot.role === "ALL" && slot.promptType === "base") {
      return this.deps.getFallbackBase();
    }

    if (slot.promptType === "role_directive" && isPromptRuntimeRole(slot.role)) {
      return this.deps.getFallbackDirective(slot.role);
    }

    return null;
  }

  private async applySideEffects(sideEffects: PromptControlPlaneSideEffects): Promise<void> {
    if (sideEffects.promptVersionChanged && this.deps.hooks?.recordPromptVersionChanged) {
      await this.deps.hooks.recordPromptVersionChanged(sideEffects.promptVersionChanged);
    }

    if (sideEffects.revalidatePaths.length > 0 && this.deps.hooks?.revalidatePaths) {
      await this.deps.hooks.revalidatePaths(sideEffects.revalidatePaths);
    }
  }
}

export function buildPromptControlPlaneService(deps: PromptControlPlaneDeps): PromptControlPlaneService {
  return new DefaultPromptControlPlaneService(deps);
}

async function findActiveConversationIdsForRole(db: Database.Database, role: string): Promise<string[]> {
  if (role === "ALL") {
    const rows = db.prepare(
      `SELECT id FROM conversations WHERE status = 'active'`,
    ).all() as Array<{ id: string }>;
    return rows.map((row) => row.id);
  }

  if (role === "ANONYMOUS") {
    const rows = db.prepare(
      `SELECT id FROM conversations WHERE status = 'active' AND user_id LIKE 'anon_%'`,
    ).all() as Array<{ id: string }>;
    return rows.map((row) => row.id);
  }

  const rows = db.prepare(
    `SELECT c.id FROM conversations c
     JOIN user_roles ur ON c.user_id = ur.user_id
     JOIN roles r ON ur.role_id = r.id
     WHERE c.status = 'active' AND r.name = ?`,
  ).all(role) as Array<{ id: string }>;

  return rows.map((row) => row.id);
}

export function createPromptControlPlaneService(options?: {
  revalidatePaths?: (paths: string[]) => Promise<void> | void;
}): PromptControlPlaneService {
  // getDb() approved: raw SQL + DataMapper mix — see data-access-canary.test.ts (Sprint 9)
  const db = getDb();
  const promptRepo = getSystemPromptDataMapper();
  const eventRecorder = new ConversationEventRecorder(getConversationEventDataMapper());

  return buildPromptControlPlaneService({
    promptRepo,
    getFallbackBase: () => new ConfigIdentitySource().getIdentity(),
    getFallbackDirective: (role) => ROLE_DIRECTIVES[role as keyof typeof ROLE_DIRECTIVES] ?? null,
    hooks: {
      revalidatePaths: options?.revalidatePaths,
      recordPromptVersionChanged: async (event) => {
        const conversationIds = await findActiveConversationIdsForRole(db, event.role);
        for (const conversationId of conversationIds) {
          await eventRecorder.record(conversationId, event.type, {
            role: event.role,
            prompt_type: event.promptType,
            old_version: event.oldVersion,
            new_version: event.newVersion,
          });
        }
      },
    },
  });
}