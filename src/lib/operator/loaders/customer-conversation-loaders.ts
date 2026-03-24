import type { User as SessionUser } from "@/core/entities/user";
import { getConversationInteractor } from "@/lib/chat/conversation-root";

import {
  assertSignedInUser,
  type ConversationWorkspaceBlockData,
  type OperatorBlockPayload,
  type RecentConversationsBlockData,
} from "../operator-shared";
import {
  buildConversationWorkspaceData,
  buildRecentConversationsData,
} from "./customer-loader-helpers";

export async function loadConversationWorkspaceBlock(
  user: Pick<SessionUser, "id" | "roles">,
): Promise<OperatorBlockPayload<ConversationWorkspaceBlockData>> {
  assertSignedInUser(user);

  const interactor = getConversationInteractor();
  const active = await interactor.getActiveForUser(user.id);

  return {
    blockId: "conversation_workspace",
    state: active ? "ready" : "empty",
    data: buildConversationWorkspaceData(active),
  };
}

export async function loadRecentConversationsBlock(
  user: Pick<SessionUser, "id" | "roles">,
): Promise<OperatorBlockPayload<RecentConversationsBlockData>> {
  assertSignedInUser(user);

  const interactor = getConversationInteractor();
  const conversations = await interactor.list(user.id);

  return {
    blockId: "recent_conversations",
    state: conversations.length > 0 ? "ready" : "empty",
    data: buildRecentConversationsData(conversations),
  };
}