import {
  getConversationDataMapper,
  getMessageDataMapper,
} from "@/adapters/RepositoryFactory";
import { DeferredJobConversationProjector } from "@/lib/jobs/deferred-job-conversation-projector";

/**
 * Create a DeferredJobConversationProjector using process-cached
 * repositories from RepositoryFactory.
 *
 * @lifetime per-call (constructor), but deps are process-cached
 */
export function createDeferredJobConversationProjector(): DeferredJobConversationProjector {
  return new DeferredJobConversationProjector(
    getConversationDataMapper(),
    getMessageDataMapper(),
  );
}