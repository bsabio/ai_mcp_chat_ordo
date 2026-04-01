import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, redirectMock, getProfileMock, panelMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  getProfileMock: vi.fn(),
  panelMock: vi.fn(({ initialProfile }: { initialProfile: { name: string } }) => (
    <div data-testid="profile-panel">{initialProfile.name}</div>
  )),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/profile/profile-service", () => ({
  createProfileService: () => ({
    getProfile: getProfileMock,
  }),
}));

vi.mock("@/components/profile/ProfileSettingsPanel", () => ({
  ProfileSettingsPanel: panelMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import ProfilePage from "@/app/profile/page";

describe("/profile page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects anonymous visitors to login", async () => {
    getSessionUserMock.mockResolvedValue({ id: "usr_anon", email: "anon@example.com", name: "Anon", roles: ["ANONYMOUS"] });

    await expect(ProfilePage()).rejects.toThrow("redirect:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("renders the profile panel with loaded profile data", async () => {
    getSessionUserMock.mockResolvedValue({ id: "usr_1", email: "morgan@example.com", name: "Morgan", roles: ["AUTHENTICATED"] });
    getProfileMock.mockResolvedValue({ id: "usr_1", name: "Morgan Lee", email: "morgan@example.com", credential: "AI strategist", pushNotificationsEnabled: true, affiliateEnabled: true, referralCode: "mentor-42", referralUrl: "https://studioordo.com/r/mentor-42", qrCodeUrl: "/api/qr/mentor-42", roles: ["AUTHENTICATED"] });

    render(await ProfilePage());

    expect(getProfileMock).toHaveBeenCalledWith("usr_1");
    expect(screen.getByTestId("profile-panel")).toHaveTextContent("Morgan Lee");
  });
});