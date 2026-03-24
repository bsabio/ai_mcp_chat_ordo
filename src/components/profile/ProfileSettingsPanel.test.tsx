import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { downloadFileFromUrlMock, writeTextMock } = vi.hoisted(() => ({
  downloadFileFromUrlMock: vi.fn(),
  writeTextMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/download-browser", () => ({
  downloadFileFromUrl: downloadFileFromUrlMock,
}));

import { ProfileSettingsPanel } from "@/components/profile/ProfileSettingsPanel";

describe("ProfileSettingsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });
  });

  it("starts a named QR download from the profile page", () => {
    render(
      <ProfileSettingsPanel
        initialProfile={{
          id: "usr_1",
          name: "Morgan Lee",
          email: "morgan@example.com",
          credential: "Enterprise AI practitioner",
          affiliateEnabled: true,
          referralCode: "mentor-42",
          referralUrl: "https://studioordo.com/?ref=mentor-42",
          qrCodeUrl: "/api/qr/mentor-42",
          roles: ["APPRENTICE"],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Download QR" }));

    expect(downloadFileFromUrlMock).toHaveBeenCalledWith("/api/qr/mentor-42", "referral-mentor-42.png");
    expect(screen.getByText("Referral QR download started.")).toBeInTheDocument();
  });

  it("copies the referral link from the profile page", async () => {
    render(
      <ProfileSettingsPanel
        initialProfile={{
          id: "usr_1",
          name: "Morgan Lee",
          email: "morgan@example.com",
          credential: "Enterprise AI practitioner",
          affiliateEnabled: true,
          referralCode: "mentor-42",
          referralUrl: "https://studioordo.com/?ref=mentor-42",
          qrCodeUrl: "/api/qr/mentor-42",
          roles: ["APPRENTICE"],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("https://studioordo.com/?ref=mentor-42");
    });
  });
});