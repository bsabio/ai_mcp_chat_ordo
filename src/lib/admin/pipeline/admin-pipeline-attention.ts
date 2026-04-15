import {
  getDealRecordDataMapper,
  getLeadRecordDataMapper,
} from "@/adapters/RepositoryFactory";
import type { User as SessionUser } from "@/core/entities/user";
import {
  assertAdminUser,
  type OperatorBlockPayload,
  type OverdueFollowUpsBlockData,
} from "@/lib/operator/operator-shared";

export async function loadOverdueFollowUpsBlock(
  user: Pick<SessionUser, "id" | "roles">,
): Promise<OperatorBlockPayload<OverdueFollowUpsBlockData>> {
  assertAdminUser(user);

  const [overdueLeads, overdueDeals] = await Promise.all([
    getLeadRecordDataMapper().listOverdueFollowUps(),
    getDealRecordDataMapper().listOverdueFollowUps(),
  ]);
  const oldestOverdueLead = overdueLeads.find((lead) => lead.followUpAt !== null);
  const oldestOverdueDeal = overdueDeals.find((deal) => deal.followUpAt !== null);
  const summary = {
    overdueLeadCount: overdueLeads.length,
    overdueDealCount: overdueDeals.length,
    totalOverdueCount: overdueLeads.length + overdueDeals.length,
  };

  return {
    blockId: "overdue_follow_ups",
    state: summary.totalOverdueCount > 0 ? "ready" : "empty",
    data: {
      summary,
      oldestOverdueLead: oldestOverdueLead && oldestOverdueLead.followUpAt
        ? {
            id: oldestOverdueLead.id,
            name: oldestOverdueLead.name ?? "Unnamed lead",
            followUpAt: oldestOverdueLead.followUpAt,
          }
        : null,
      oldestOverdueDeal: oldestOverdueDeal && oldestOverdueDeal.followUpAt
        ? {
            id: oldestOverdueDeal.id,
            title: oldestOverdueDeal.title,
            followUpAt: oldestOverdueDeal.followUpAt,
          }
        : null,
    },
  };
}