import { revalidatePath } from "next/cache";

import type { CreditStatus } from "@/core/entities/Referral";
import { getAdminAffiliatesPath } from "@/lib/admin/admin-routes";
import { readRequiredEnum, readRequiredText } from "@/lib/admin/shared/admin-form-parsers";
import { runAdminAction } from "@/lib/admin/shared/admin-action-helpers";
import { getReferralLedgerService } from "@/lib/referrals/referral-ledger";

const CREDIT_STATUS_VALUES = ["tracked", "pending_review", "approved", "paid", "void"] as const;

export function parseReferralCreditStateForm(formData: FormData): {
  referralId: string;
  creditStatus: CreditStatus;
  reason: string;
} {
  return {
    referralId: readRequiredText(formData, "referralId"),
    creditStatus: readRequiredEnum(formData, "creditStatus", CREDIT_STATUS_VALUES),
    reason: readRequiredText(formData, "reason"),
  };
}

export async function updateReferralCreditStateAction(formData: FormData) {
  "use server";

  return runAdminAction(formData, async (admin, innerFormData) => {
    const { referralId, creditStatus, reason } = parseReferralCreditStateForm(innerFormData);
    await getReferralLedgerService().recordCreditStateChanged({
      referralId,
      actorUserId: admin.id,
      creditStatus,
      reason,
    });
    revalidatePath(getAdminAffiliatesPath());
  });
}