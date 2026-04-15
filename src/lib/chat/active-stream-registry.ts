type ActiveStreamEntry = {
  streamId: string;
  ownerUserId: string;
  conversationId: string;
  createdAt: string;
  abortController: AbortController;
};

export type ActiveStreamSnapshot = Omit<ActiveStreamEntry, "abortController">;

export class ActiveStreamConflictError extends Error {
  constructor(readonly existingStream: ActiveStreamSnapshot) {
    super(`Active stream already exists for conversation "${existingStream.conversationId}".`);
    this.name = "ActiveStreamConflictError";
  }
}

const activeStreams = new Map<string, ActiveStreamEntry>();

export function getActiveStreamSnapshotForOwnerConversation(
  ownerUserId: string,
  conversationId: string,
): ActiveStreamSnapshot | null {
  for (const entry of activeStreams.values()) {
    if (entry.ownerUserId === ownerUserId && entry.conversationId === conversationId) {
      return {
        streamId: entry.streamId,
        ownerUserId: entry.ownerUserId,
        conversationId: entry.conversationId,
        createdAt: entry.createdAt,
      };
    }
  }

  return null;
}

export function registerActiveStream(input: {
  ownerUserId: string;
  conversationId: string;
  abortController: AbortController;
  streamId?: string;
}): ActiveStreamSnapshot & { unregister: () => void } {
  const existingStream = getActiveStreamSnapshotForOwnerConversation(input.ownerUserId, input.conversationId);
  if (existingStream) {
    throw new ActiveStreamConflictError(existingStream);
  }

  const streamId = input.streamId ?? crypto.randomUUID();
  const entry: ActiveStreamEntry = {
    streamId,
    ownerUserId: input.ownerUserId,
    conversationId: input.conversationId,
    createdAt: new Date().toISOString(),
    abortController: input.abortController,
  };

  activeStreams.set(streamId, entry);

  return {
    streamId: entry.streamId,
    ownerUserId: entry.ownerUserId,
    conversationId: entry.conversationId,
    createdAt: entry.createdAt,
    unregister: () => {
      activeStreams.delete(streamId);
    },
  };
}

export function getActiveStreamSnapshot(streamId: string): ActiveStreamSnapshot | null {
  const entry = activeStreams.get(streamId);
  if (!entry) {
    return null;
  }

  return {
    streamId: entry.streamId,
    ownerUserId: entry.ownerUserId,
    conversationId: entry.conversationId,
    createdAt: entry.createdAt,
  };
}

export function stopActiveStream(
  streamId: string,
  ownerUserId: string,
): ActiveStreamSnapshot | null {
  const entry = activeStreams.get(streamId);

  if (!entry || entry.ownerUserId !== ownerUserId) {
    return null;
  }

  activeStreams.delete(streamId);
  entry.abortController.abort("stopped_by_owner");

  return {
    streamId: entry.streamId,
    ownerUserId: entry.ownerUserId,
    conversationId: entry.conversationId,
    createdAt: entry.createdAt,
  };
}

export function clearActiveStreamsForTests(): void {
  activeStreams.clear();
}