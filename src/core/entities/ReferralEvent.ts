export interface ReferralEvent {
  id: string;
  referralId: string;
  conversationId: string | null;
  eventType: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  createdAt: string;
}