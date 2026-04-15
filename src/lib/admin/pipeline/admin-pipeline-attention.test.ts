import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getLeadRecordDataMapperMock,
  getDealRecordDataMapperMock,
  leadListOverdueFollowUpsMock,
  dealListOverdueFollowUpsMock,
} = vi.hoisted(() => ({
  getLeadRecordDataMapperMock: vi.fn(),
  getDealRecordDataMapperMock: vi.fn(),
  leadListOverdueFollowUpsMock: vi.fn(),
  dealListOverdueFollowUpsMock: vi.fn(),
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getLeadRecordDataMapper: getLeadRecordDataMapperMock,
  getDealRecordDataMapper: getDealRecordDataMapperMock,
}));

import { loadOverdueFollowUpsBlock } from "./admin-pipeline-attention";

describe("admin-pipeline-attention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLeadRecordDataMapperMock.mockReturnValue({
      listOverdueFollowUps: leadListOverdueFollowUpsMock,
    });
    getDealRecordDataMapperMock.mockReturnValue({
      listOverdueFollowUps: dealListOverdueFollowUpsMock,
    });
  });

  it("summarizes overdue lead and deal follow-ups through repository loaders", async () => {
    leadListOverdueFollowUpsMock.mockResolvedValue([
      {
        id: "lead_1",
        conversationId: "conv_lead_1",
        lane: "organization",
        name: "Alex Rivera",
        email: "alex@example.com",
        organization: "Northwind Labs",
        triageState: "new",
        followUpAt: "2026-04-10T09:00:00.000Z",
        createdAt: "2026-04-09T09:00:00.000Z",
      },
    ]);
    dealListOverdueFollowUpsMock.mockResolvedValue([
      {
        id: "deal_1",
        title: "Workflow redesign advisory",
        organizationName: "Northwind Labs",
        recommendedServiceType: "advisory",
        estimatedPrice: 6000,
        status: "qualified",
        followUpAt: "2026-04-11T09:00:00.000Z",
        createdAt: "2026-04-08T09:00:00.000Z",
      },
    ]);

    await expect(loadOverdueFollowUpsBlock({ id: "admin_1", roles: ["ADMIN"] })).resolves.toEqual({
      blockId: "overdue_follow_ups",
      state: "ready",
      data: {
        summary: {
          overdueLeadCount: 1,
          overdueDealCount: 1,
          totalOverdueCount: 2,
        },
        oldestOverdueLead: {
          id: "lead_1",
          name: "Alex Rivera",
          followUpAt: "2026-04-10T09:00:00.000Z",
        },
        oldestOverdueDeal: {
          id: "deal_1",
          title: "Workflow redesign advisory",
          followUpAt: "2026-04-11T09:00:00.000Z",
        },
      },
    });
  });

  it("returns an empty block when no overdue follow-ups remain", async () => {
    leadListOverdueFollowUpsMock.mockResolvedValue([]);
    dealListOverdueFollowUpsMock.mockResolvedValue([]);

    await expect(loadOverdueFollowUpsBlock({ id: "admin_1", roles: ["ADMIN"] })).resolves.toEqual({
      blockId: "overdue_follow_ups",
      state: "empty",
      data: {
        summary: {
          overdueLeadCount: 0,
          overdueDealCount: 0,
          totalOverdueCount: 0,
        },
        oldestOverdueLead: null,
        oldestOverdueDeal: null,
      },
    });
  });
});