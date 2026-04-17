import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionUserMock,
  loadUserMediaWorkspaceMock,
  redirectMock,
  workspaceMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  loadUserMediaWorkspaceMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  workspaceMock: vi.fn((props: { userName: string; items: unknown[]; hasMore: boolean }) => (
    <div data-testid="user-media-workspace">{props.userName}:{props.items.length}:{String(props.hasMore)}</div>
  )),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/media/user-media", () => ({
  loadUserMediaWorkspace: loadUserMediaWorkspaceMock,
}));

vi.mock("@/components/media/UserMediaWorkspace", () => ({
  UserMediaWorkspace: workspaceMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import MyMediaPage from "@/app/my/media/page";

describe("/my/media page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects anonymous visitors to login", async () => {
    getSessionUserMock.mockResolvedValue({ id: "usr_anon", email: "anon@example.com", name: "Anon", roles: ["ANONYMOUS"] });

    await expect(MyMediaPage()).rejects.toThrow("redirect:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("renders the signed-in media workspace", async () => {
    getSessionUserMock.mockResolvedValue({ id: "usr_signed_in", email: "signed@example.com", name: "Apprentice", roles: ["APPRENTICE"] });
    loadUserMediaWorkspaceMock.mockResolvedValue({
      items: [{ id: "uf_1" }],
      filters: { search: "", fileType: null, source: null, retentionClass: null, attached: null },
      summary: {},
      quota: { status: "normal" },
      hasMore: true,
    });

    render(await MyMediaPage({ searchParams: Promise.resolve({ type: "image" }) }));

    expect(loadUserMediaWorkspaceMock).toHaveBeenCalledWith("usr_signed_in", { type: "image" });
    expect(screen.getByTestId("user-media-workspace")).toHaveTextContent("Apprentice:1:true");
  });
});