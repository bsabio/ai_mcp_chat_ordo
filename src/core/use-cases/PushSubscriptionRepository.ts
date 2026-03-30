import type {
  PushSubscriptionRecord,
  PushSubscriptionSeed,
} from "@/core/entities/push-subscription";

export interface PushSubscriptionRepository {
  upsert(seed: PushSubscriptionSeed): Promise<PushSubscriptionRecord>;
  listByUser(userId: string): Promise<PushSubscriptionRecord[]>;
  deleteByEndpoint(endpoint: string): Promise<void>;
  markNotified(endpoint: string, notifiedAt: string): Promise<void>;
}