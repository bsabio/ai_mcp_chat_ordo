import type { MediaAssetKind } from "@/core/entities/media-asset";
import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type { UserFileRepository } from "@/core/use-cases/UserFileRepository";
import {
  projectUserFileToConversationMediaAssetCandidate,
  type ConversationMediaAssetCandidate,
} from "@/lib/media/media-asset-projection";

const ALLOWED_MEDIA_ASSET_KINDS = [
  "audio",
  "chart",
  "graph",
  "image",
  "video",
  "subtitle",
  "waveform",
] as const satisfies readonly MediaAssetKind[];

export interface ListConversationMediaAssetsInput {
  kinds?: MediaAssetKind[];
  limit?: number;
}

interface ListConversationMediaAssetsOutput {
  ok: true;
  action: "list_conversation_media_assets";
  conversationId: string;
  assets: ConversationMediaAssetCandidate[];
  summary: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAllowedMediaAssetKind(value: string): value is MediaAssetKind {
  return ALLOWED_MEDIA_ASSET_KINDS.includes(value as MediaAssetKind);
}

export function parseListConversationMediaAssetsInput(value: unknown): ListConversationMediaAssetsInput {
  if (!isRecord(value)) {
    return {};
  }

  const kinds = Array.isArray(value.kinds)
    ? value.kinds.map((item) => {
        if (typeof item !== "string" || !isAllowedMediaAssetKind(item)) {
          throw new Error(`Unsupported media asset kind: ${String(item)}`);
        }

        return item;
      })
    : undefined;

  const limit = value.limit;
  if (limit !== undefined && (typeof limit !== "number" || !Number.isFinite(limit))) {
    throw new Error("limit must be a finite number when provided.");
  }

  return {
    ...(kinds ? { kinds } : {}),
    ...(typeof limit === "number" ? { limit } : {}),
  };
}

class ListConversationMediaAssetsCommand implements ToolCommand<
  ListConversationMediaAssetsInput,
  ListConversationMediaAssetsOutput
> {
  constructor(private readonly userFileRepository: UserFileRepository) {}

  async execute(
    input: ListConversationMediaAssetsInput,
    context?: ToolExecutionContext,
  ): Promise<ListConversationMediaAssetsOutput> {
    if (!context || context.role === "ANONYMOUS") {
      throw new Error("Sign in is required to inspect reusable media assets.");
    }

    if (!context.conversationId) {
      throw new Error("Conversation context is required to list reusable media assets.");
    }

    const limit = Math.min(Math.max(Math.trunc(input.limit ?? 25), 1), 25);
    const allowedKinds = new Set(input.kinds ?? ALLOWED_MEDIA_ASSET_KINDS);
    const files = await this.userFileRepository.listByConversation(context.conversationId);
    const assets = files
      .filter((file) => file.userId === context.userId)
      .map(projectUserFileToConversationMediaAssetCandidate)
      .filter((asset): asset is ConversationMediaAssetCandidate => Boolean(asset))
      .filter((asset) => allowedKinds.has(asset.assetKind))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);

    return {
      ok: true,
      action: "list_conversation_media_assets",
      conversationId: context.conversationId,
      assets,
      summary: assets.length === 0
        ? "No reusable media assets were found for this conversation."
        : `Returned ${assets.length} reusable media asset${assets.length === 1 ? "" : "s"} for this conversation.`,
    };
  }
}

export function createListConversationMediaAssetsTool(
  userFileRepository: UserFileRepository,
): ToolDescriptor<ListConversationMediaAssetsInput, ListConversationMediaAssetsOutput> {
  return {
    name: "list_conversation_media_assets",
    schema: {
      description:
        "List reusable governed media assets already attached to the current conversation. Use before compose_media when the user wants to reuse an earlier chart, graph, audio track, image, or video instead of regenerating it.",
      input_schema: {
        type: "object",
        properties: {
          kinds: {
            type: "array",
            description: "Optional media kinds to include in the result.",
            items: {
              type: "string",
              enum: [...ALLOWED_MEDIA_ASSET_KINDS],
            },
          },
          limit: {
            type: "number",
            description: "Maximum number of assets to return, between 1 and 25.",
          },
        },
      },
    },
    command: new ListConversationMediaAssetsCommand(userFileRepository),
    roles: ["AUTHENTICATED", "APPRENTICE", "STAFF", "ADMIN"],
    category: "content",
  };
}