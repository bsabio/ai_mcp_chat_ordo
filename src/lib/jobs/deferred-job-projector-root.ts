import { ConversationDataMapper } from "@/adapters/ConversationDataMapper";
import { MessageDataMapper } from "@/adapters/MessageDataMapper";
import { getDb } from "@/lib/db";
import { DeferredJobConversationProjector } from "@/lib/jobs/deferred-job-conversation-projector";

export function createDeferredJobConversationProjector(): DeferredJobConversationProjector {
  const db = getDb();

  return new DeferredJobConversationProjector(
    new ConversationDataMapper(db),
    new MessageDataMapper(db),
  );
}