import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireOperationsWorkspaceAccessMock,
  loadOperationsMediaWorkspaceMock,
  workspaceMock,
} = vi.hoisted(() => ({
  requireOperationsWorkspaceAccessMock: vi.fn(),
  loadOperationsMediaWorkspaceMock: vi.fn(),
  workspaceMock: vi.fn((props: { userName: string; totalCount: number }) => (
    <div data-testid="operations-media-workspace">{props.userName}:{props.totalCount}</div>
  )),
}));

vi.mock("@/lib/operations/operations-access", () => ({
  requireOperationsWorkspaceAccess: requireOperationsWorkspaceAccessMock,
}));

vi.mock("@/lib/media/media-operations", () => ({
  loadOperationsMediaWorkspace: loadOperationsMediaWorkspaceMock,
}));

vi.mock("@/components/media/MediaOperationsWorkspace", () => ({
  MediaOperationsWorkspace: workspaceMock,
}));

import OperationsMediaPage from "@/app/operations/media/page";

describe("/operations/media page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the operations media workspace for staff and admin viewers", async () => {
    requireOperationsWorkspaceAccessMock.mockResolvedValue({ id: "usr_staff", email: "staff@example.com", name: "Staff Analyst", roles: ["STAFF"] });
    loadOperationsMediaWorkspaceMock.mockResolvedValue({
      filters: { search: "", userId: "", fileType: null, source: null, retentionClass: null, attached: null },
      items: [],
      totalCount: 12,
      page: 1,
      pageSize: 50,
      hasPrevPage: false,
      hasNextPage: false,
      fleetAccount: {},
      hostCapacity: { status: "unavailable", reason: "statfs unavailable" },
    });

    render(await OperationsMediaPage({ searchParams: Promise.resolve({ userId: "usr_1" }) }));

    expect(loadOperationsMediaWorkspaceMock).toHaveBeenCalledWith(["STAFF"], { userId: "usr_1" });
    expect(screen.getByTestId("operations-media-workspace")).toHaveTextContent("Staff Analyst:12");
  });
});