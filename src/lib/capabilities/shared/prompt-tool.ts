import { ConfigIdentitySource } from "@/adapters/ConfigIdentitySource";
import type {
  PromptControlPlaneService,
  PromptControlPlaneSlotSummary,
} from "@/core/use-cases/PromptControlPlaneService";
import { ROLE_DIRECTIVES } from "@/core/entities/role-directives";
import type { ConversationEventRecorder } from "@/core/use-cases/ConversationEventRecorder";
import type { SystemPromptRepository } from "@/core/use-cases/SystemPromptRepository";
import { buildPromptControlPlaneService } from "@/lib/prompts/prompt-control-plane-service";
import { getPromptProvenanceStore } from "@/lib/prompts/prompt-provenance-store";
import { findPromptTurnProvenance, replayPromptTurnProvenanceRecord } from "@/lib/prompts/prompt-provenance-service";

export interface PromptToolDeps {
  service?: PromptControlPlaneService;
  promptRepo?: SystemPromptRepository;
  eventRecorder?: ConversationEventRecorder;
  findActiveConversationIds?: (role: string) => Promise<string[]>;
}

function getPromptControlPlaneService(deps: PromptToolDeps): PromptControlPlaneService {
  if (deps.service) {
    return deps.service;
  }

  if (!deps.promptRepo || !deps.eventRecorder || !deps.findActiveConversationIds) {
    throw new Error(
      "PromptToolDeps must provide either service or promptRepo/eventRecorder/findActiveConversationIds.",
    );
  }

  return buildPromptControlPlaneService({
    promptRepo: deps.promptRepo,
    getFallbackBase: () => new ConfigIdentitySource().getIdentity(),
    getFallbackDirective: (role) => ROLE_DIRECTIVES[role as keyof typeof ROLE_DIRECTIVES] ?? null,
    hooks: {
      recordPromptVersionChanged: async (event) => {
        const conversationIds = await deps.findActiveConversationIds?.(event.role) ?? [];
        for (const conversationId of conversationIds) {
          await deps.eventRecorder?.record(conversationId, event.type, {
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

function toRuntimeSlot(slot: PromptControlPlaneSlotSummary) {
  return {
    role: slot.role,
    prompt_type: slot.promptType,
    active_version: slot.activeVersion,
    total_versions: slot.totalVersions,
    last_updated: slot.lastUpdated,
    updated_by: slot.updatedBy,
    runtime_coverage: slot.runtimeCoverage,
  };
}

// 3.8 — prompt_list
export async function promptList(
  deps: PromptToolDeps,
  args: { role?: string; prompt_type?: string },
): Promise<unknown> {
  const service = getPromptControlPlaneService(deps);
  const slots = await service.listSlots({
    role: args.role,
    promptType: args.prompt_type as "base" | "role_directive" | undefined,
  });

  const results: Array<{
    role: string;
    prompt_type: string;
    version: number;
    is_active: boolean;
    created_at: string;
    created_by: string | null;
    notes: string;
    content_preview: string;
  }> = [];

  for (const slot of slots) {
    const detail = await service.getSlotDetail(slot);
    for (const version of detail.versions) {
      results.push({
        role: version.role,
        prompt_type: version.promptType,
        version: version.version,
        is_active: version.isActive,
        created_at: version.createdAt,
        created_by: version.createdBy,
        notes: version.notes,
        content_preview: version.content.slice(0, 200),
      });
    }
  }

  return {
    prompts: results,
    count: results.length,
    runtime_slots: slots.map(toRuntimeSlot),
    runtime_slot_count: slots.length,
  };
}

// 3.9 — prompt_get
export async function promptGet(
  deps: PromptToolDeps,
  args: { role: string; prompt_type: string; version?: number },
): Promise<unknown> {
  const service = getPromptControlPlaneService(deps);

  if (args.version != null) {
    const detail = await service.getSlotDetail({
      role: args.role,
      promptType: args.prompt_type as "base" | "role_directive",
    });
    const prompt = detail.versions.find((version) => version.version === args.version) ?? null;

    if (!prompt) {
      return {
        error: `No prompt found for role=${args.role}, type=${args.prompt_type}, version=${args.version}`,
        runtime_coverage: "missing",
      };
    }

    return {
      role: prompt.role,
      prompt_type: prompt.promptType,
      version: prompt.version,
      content: prompt.content,
      is_active: prompt.isActive,
      created_at: prompt.createdAt,
      created_by: prompt.createdBy,
      notes: prompt.notes,
      runtime_coverage: "db",
    };
  }

  const detail = await service.getSlotDetail({
    role: args.role,
    promptType: args.prompt_type as "base" | "role_directive",
  });
  const activeStoredVersion = detail.versions.find((version) => version.isActive) ?? null;

  if (detail.slot.runtimeCoverage === "missing") {
    return {
      error: `No prompt found for role=${args.role}, type=${args.prompt_type}`,
      runtime_coverage: "missing",
    };
  }

  return {
    role: detail.slot.role,
    prompt_type: detail.slot.promptType,
    version: detail.slot.activeVersion,
    content: detail.activeContent,
    is_active: detail.slot.activeVersion != null,
    created_at: activeStoredVersion?.createdAt ?? null,
    created_by: activeStoredVersion?.createdBy ?? null,
    notes: detail.slot.runtimeCoverage === "fallback"
      ? "runtime fallback"
      : (activeStoredVersion?.notes ?? ""),
    runtime_coverage: detail.slot.runtimeCoverage,
  };
}

// 3.10 — prompt_set
export async function promptSet(
  deps: PromptToolDeps,
  args: { role: string; prompt_type: string; content: string; notes: string; created_by?: string },
): Promise<unknown> {
  const service = getPromptControlPlaneService(deps);
  const created = await service.createVersion({
    role: args.role,
    promptType: args.prompt_type as "base" | "role_directive",
    content: args.content,
    createdBy: args.created_by ?? "admin",
    notes: args.notes,
  });

  await service.activateVersion({
    role: args.role,
    promptType: args.prompt_type as "base" | "role_directive",
    version: created.created.version,
  });

  return { version: created.created.version, activated: true };
}

// 3.11 — prompt_rollback
export async function promptRollback(
  deps: PromptToolDeps,
  args: { role: string; prompt_type: string; version: number },
): Promise<unknown> {
  const service = getPromptControlPlaneService(deps);

  try {
    const result = await service.rollback({
      role: args.role,
      promptType: args.prompt_type as "base" | "role_directive",
      version: args.version,
    });

    return {
      activated_version: result.activatedVersion,
      deactivated_version: result.deactivatedVersion,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// 3.12 — prompt_diff (LCS-based line diff, no external deps)
export async function promptDiff(
  deps: PromptToolDeps,
  args: { role: string; prompt_type: string; version_a: number; version_b: number },
): Promise<unknown> {
  const service = getPromptControlPlaneService(deps);

  try {
    const diff = await service.diffVersions({
      role: args.role,
      promptType: args.prompt_type as "base" | "role_directive",
      versionA: args.version_a,
      versionB: args.version_b,
    });

    return {
      role: diff.role,
      prompt_type: diff.promptType,
      version_a: diff.versionA,
      version_b: diff.versionB,
      diff: diff.diff,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Sprint 19 — prompt_get_provenance
export async function promptGetProvenance(
  args: { conversation_id?: string; turn_id?: string; include_replay_diff?: boolean },
): Promise<unknown> {
  const store = getPromptProvenanceStore();

  if (!args.conversation_id) {
    return {
      error: "conversation_id is required. Provide the ID of a conversation to inspect prompt provenance.",
    };
  }

  const record = await findPromptTurnProvenance({
    conversationId: args.conversation_id,
    turnId: args.turn_id ?? null,
  });

  if (record) {
    const replay = args.include_replay_diff
      ? await replayPromptTurnProvenanceRecord(record)
      : null;

    return {
      conversation_id: args.conversation_id,
      turn_id: record.assistantMessageId ?? record.userMessageId,
      user_message_id: record.userMessageId,
      assistant_message_id: record.assistantMessageId,
      surface: record.surface,
      effective_hash: record.effectiveHash,
      slot_refs: record.slotRefs,
      sections: record.sections,
      warnings: record.warnings,
      recorded_at: record.recordedAt,
      ...(replay
        ? {
            replay: {
              matches: replay.matches,
              rebuilt_effective_hash: replay.rebuilt.effectiveHash,
              drift_warnings: replay.diff.driftWarnings,
              diff: replay.diff,
            },
          }
        : {}),
    };
  }

  if (!args.turn_id) {
    const provenance = store.get(args.conversation_id);
    if (provenance) {
      return { conversation_id: args.conversation_id, ...provenance };
    }
  }

  return {
    error: args.turn_id
      ? `No provenance found for conversation ${args.conversation_id} and turn ${args.turn_id}. Durable audit data is not available for the requested turn.`
      : `No provenance found for conversation ${args.conversation_id}. Provenance is available only for recent chat turns.`,
    conversation_id: args.conversation_id,
    ...(args.turn_id ? { turn_id: args.turn_id } : {}),
  };
}

// ---------------------------------------------------------------------------
// Tool schemas — Sprint 17: extracted from the MCP operations server transport shell
// ---------------------------------------------------------------------------

export function getPromptToolSchemas() {
  return [
    {
      name: "prompt_list",
      description: "List all system prompt versions, optionally filtered by role and/or prompt_type.",
      inputSchema: {
        type: "object" as const,
        properties: {
          role: { type: "string", description: "Filter by role (e.g. 'ALL', 'ANONYMOUS', 'ADMIN')." },
          prompt_type: { type: "string", description: "Filter by type ('base' or 'role_directive')." },
        },
        additionalProperties: false,
      },
    },
    {
      name: "prompt_get",
      description: "Get a specific system prompt. Returns the active version by default, or a specific version if provided.",
      inputSchema: {
        type: "object" as const,
        properties: {
          role: { type: "string", description: "Prompt role." },
          prompt_type: { type: "string", description: "Prompt type ('base' or 'role_directive')." },
          version: { type: "number", description: "Specific version number (omit for active)." },
        },
        required: ["role", "prompt_type"],
        additionalProperties: false,
      },
    },
    {
      name: "prompt_set",
      description: "Create a new prompt version and immediately activate it. The previous active version is retained.",
      inputSchema: {
        type: "object" as const,
        properties: {
          role: { type: "string", description: "Prompt role." },
          prompt_type: { type: "string", description: "Prompt type ('base' or 'role_directive')." },
          content: { type: "string", description: "Full prompt text." },
          notes: { type: "string", description: "Explanation of why this change was made." },
        },
        required: ["role", "prompt_type", "content", "notes"],
        additionalProperties: false,
      },
    },
    {
      name: "prompt_rollback",
      description: "Reactivate a previous prompt version.",
      inputSchema: {
        type: "object" as const,
        properties: {
          role: { type: "string", description: "Prompt role." },
          prompt_type: { type: "string", description: "Prompt type ('base' or 'role_directive')." },
          version: { type: "number", description: "Version number to reactivate." },
        },
        required: ["role", "prompt_type", "version"],
        additionalProperties: false,
      },
    },
    {
      name: "prompt_diff",
      description: "Line-by-line diff between two prompt versions.",
      inputSchema: {
        type: "object" as const,
        properties: {
          role: { type: "string", description: "Prompt role." },
          prompt_type: { type: "string", description: "Prompt type ('base' or 'role_directive')." },
          version_a: { type: "number", description: "First version to compare." },
          version_b: { type: "number", description: "Second version to compare." },
        },
        required: ["role", "prompt_type", "version_a", "version_b"],
        additionalProperties: false,
      },
    },
    {
      name: "prompt_get_provenance",
      description: "Inspect durable prompt provenance for a conversation turn. Returns slot sources, section keys, assembly warnings, and optional replay drift diagnostics.",
      inputSchema: {
        type: "object" as const,
        properties: {
          conversation_id: { type: "string", description: "Conversation ID to inspect." },
          turn_id: { type: "string", description: "Optional user or assistant message ID for a specific turn. Defaults to the latest recorded prompt turn." },
          include_replay_diff: { type: "boolean", description: "Set to true to rebuild the prompt from stored replay inputs and return structural drift diagnostics." },
        },
        required: ["conversation_id"],
        additionalProperties: false,
      },
    },
  ];
}
