export interface Referral {
  id: string;
  referrerUserId: string;
  conversationId: string | null;
  referralCode: string;
  scannedAt: string | null;
  convertedAt: string | null;
  outcome: string | null;
  createdAt: string;
}
