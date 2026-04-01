export type ReferralStatus =
  | "visited"
  | "engaged"
  | "registered"
  | "lead"
  | "consultation"
  | "deal"
  | "training"
  | "credited"
  | "void";

export type CreditStatus = "tracked" | "pending_review" | "approved" | "paid" | "void";

export interface Referral {
  id: string;
  referrerUserId: string;
  referredUserId: string | null;
  conversationId: string | null;
  referralCode: string;
  visitId: string | null;
  status: ReferralStatus;
  creditStatus: CreditStatus;
  scannedAt: string | null;
  convertedAt: string | null;
  lastValidatedAt: string | null;
  lastEventAt: string | null;
  outcome: string | null;
  metadataJson: string;
  createdAt: string;
}

export interface TrustedReferralContext {
  referralId: string;
  referralCode: string;
  referrerUserId: string;
  referrerName: string;
  referrerCredential: string | null;
  referredUserId: string | null;
  conversationId: string | null;
  status: ReferralStatus;
  creditStatus: CreditStatus;
}
