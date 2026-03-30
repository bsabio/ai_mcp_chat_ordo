/**
 * D4.6 — Conversation admin loaders.
 *
 * Provides list and detail view models for the conversations admin surface.
 * Uses the admin extension methods added to ConversationDataMapper (D4.7).
 */

import { getConversationDataMapper, getMessageDataMapper, getUserDataMapper } from "@/adapters/RepositoryFactory";
import type { Message } from "@/core/entities/conversation";
import { getAdminConversationDetailPath } from "./admin-conversations-routes";

// ── View-model types ───────────────────────────────────────────────────

export interface AdminConversationListEntry {
  id: string;
  userId: string;
  userName: string;
  title: string;
  status: string;
  lane: string;
  laneConfidence: number | null;
  messageCount: number;
  lastToolUsed: string | null;
  sessionSource: string;
  conversationMode: string;
  createdAt: string;
  updatedAt: string;
  detailHref: string;
}

export interface AdminConversationDetailViewModel {
  conversation: AdminConversationListEntry & {
    detectedNeedSummary: string | null;
    recommendedNextStep: string | null;
    promptVersion: number | null;
    referralSource: string | null;
    convertedFrom: string | null;
  };
  messages: Array<{
    id: string;
    role: string;
    content: string;
    parts: unknown[];
    tokenEstimate: number;
    createdAt: string;
  }>;
  totalTokens: number;
}

export interface ConversationFilters {
  status?: string;
  lane?: string;
  sessionSource?: string;
}

export interface AdminConversationsPipelineData {
  entries: AdminConversationListEntry[];
  total: number;
  statusCounts: Record<string, number>;
  laneCounts: Record<string, number>;
  filters: ConversationFilters;
}

// ── Loaders ────────────────────────────────────────────────────────────

export async function loadAdminConversations(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<AdminConversationsPipelineData> {
  const convMapper = getConversationDataMapper();
  const userMapper = getUserDataMapper();

  const filters: ConversationFilters = {
    status: typeof searchParams.status === "string" ? searchParams.status : undefined,
    lane: typeof searchParams.lane === "string" ? searchParams.lane : undefined,
    sessionSource: typeof searchParams.sessionSource === "string" ? searchParams.sessionSource : undefined,
  };

  const [rows, total, statusCounts, laneCounts] = await Promise.all([
    convMapper.listForAdmin(filters),
    convMapper.countForAdmin(filters),
    convMapper.countByStatus(),
    convMapper.countByLane(),
  ]);

  // Build a map of user IDs → names
  const userIds = [...new Set(rows.map((r) => r.userId))];
  const userNames = new Map<string, string>();
  for (const uid of userIds) {
    const user = await userMapper.findById(uid);
    userNames.set(uid, user?.name ?? user?.email ?? uid);
  }

  const entries: AdminConversationListEntry[] = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: userNames.get(r.userId) ?? r.userId,
    title: r.title,
    status: r.status,
    lane: r.routingSnapshot.lane,
    laneConfidence: r.routingSnapshot.confidence,
    messageCount: r.messageCount,
    lastToolUsed: r.lastToolUsed,
    sessionSource: r.sessionSource,
    conversationMode: (r as unknown as Record<string, unknown>).conversationMode as string ?? "ai",
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    detailHref: getAdminConversationDetailPath(r.id),
  }));

  return { entries, total, statusCounts, laneCounts, filters };
}

export async function loadAdminConversationDetail(
  id: string,
): Promise<AdminConversationDetailViewModel> {
  const convMapper = getConversationDataMapper();
  const msgMapper = getMessageDataMapper();
  const userMapper = getUserDataMapper();

  const conv = await convMapper.findById(id);
  if (!conv) {
    throw new Error(`Conversation not found: ${id}`);
  }

  const user = await userMapper.findById(conv.userId);
  const userName = user?.name ?? user?.email ?? conv.userId;

  const messages = await msgMapper.listByConversation(id);
  const totalTokens = messages.reduce((sum: number, m: Message) => sum + m.tokenEstimate, 0);

  const entry: AdminConversationDetailViewModel["conversation"] = {
    id: conv.id,
    userId: conv.userId,
    userName,
    title: conv.title,
    status: conv.status,
    lane: conv.routingSnapshot.lane,
    laneConfidence: conv.routingSnapshot.confidence,
    messageCount: conv.messageCount,
    lastToolUsed: conv.lastToolUsed,
    sessionSource: conv.sessionSource,
    conversationMode: (conv as unknown as Record<string, unknown>).conversationMode as string ?? "ai",
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
    detailHref: getAdminConversationDetailPath(conv.id),
    detectedNeedSummary: conv.routingSnapshot.detectedNeedSummary,
    recommendedNextStep: conv.routingSnapshot.recommendedNextStep,
    promptVersion: conv.promptVersion,
    referralSource: conv.referralSource,
    convertedFrom: conv.convertedFrom,
  };

  return {
    conversation: entry,
    messages: messages.map((m: Message) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      parts: m.parts,
      tokenEstimate: m.tokenEstimate,
      createdAt: m.createdAt,
    })),
    totalTokens,
  };
}
