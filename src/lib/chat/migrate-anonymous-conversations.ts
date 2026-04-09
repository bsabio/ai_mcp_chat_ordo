import { cookies } from "next/headers";
import { getConversationDataMapper, getJobQueueRepository } from "@/adapters/RepositoryFactory";
import { getConversationInteractor } from "@/lib/chat/conversation-root";
import { repairConversationOwnershipIndex } from "@/lib/chat/embed-conversation";
import { clearAnonSession } from "@/lib/chat/resolve-user";
import { getReferralLedgerService } from "@/lib/referrals/referral-ledger";

async function resolveMigrationConversationIds(
  userId: string,
  anonUserId: string,
  migratedConversationIds: string[],
): Promise<string[]> {
  if (migratedConversationIds.length > 0) {
    return migratedConversationIds;
  }

  return getConversationDataMapper().findIdsByUserAndConvertedFrom(userId, anonUserId);
}

export async function migrateAnonymousConversationsToUser(
  userId: string,
  source: "login" | "registration",
): Promise<{ migratedConversationIds: string[] }> {
  const cookieStore = await cookies();
  const anonCookie = cookieStore.get("lms_anon_session")?.value;

  if (!anonCookie) {
    return { migratedConversationIds: [] };
  }

  const anonUserId = `anon_${anonCookie}`;
  const interactor = getConversationInteractor();
  const migratedConversationIds = await interactor.migrateAnonymousConversations(
    anonUserId,
    userId,
  );

  await Promise.all(
    migratedConversationIds.map((conversationId) =>
      repairConversationOwnershipIndex(conversationId, userId, anonUserId)
        .catch((error) => {
          console.error(
            `Conversation index repair failed during ${source}:`,
            error,
          );
        }),
    ),
  );

  const resolvedConversationIds = await resolveMigrationConversationIds(
    userId,
    anonUserId,
    migratedConversationIds,
  );
  await getJobQueueRepository().transferJobsToUser({
    conversationIds: resolvedConversationIds,
    userId,
    previousUserId: anonUserId,
    source,
  });
  const referralLedger = getReferralLedgerService();
  const referralResults = await Promise.allSettled(
    resolvedConversationIds.map((conversationId) =>
      referralLedger.linkConversationToAuthenticatedUser({
        conversationId,
        userId,
        source,
      }),
    ),
  );

  const referralFailure = referralResults.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (referralFailure) {
    console.error(
      `Referral linkage failed during ${source}:`,
      referralFailure.reason,
    );
    throw new Error(`Anonymous conversation referral migration failed during ${source}.`);
  }

  await clearAnonSession();

  return { migratedConversationIds: resolvedConversationIds };
}