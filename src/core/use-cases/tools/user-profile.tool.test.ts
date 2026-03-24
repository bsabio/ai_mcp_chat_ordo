import { describe, expect, it, vi } from "vitest";

import {
  createGetMyProfileTool,
  createGetMyReferralQrTool,
  createUpdateMyProfileTool,
} from "@/core/use-cases/tools/user-profile.tool";
import type { UserProfileViewModel } from "@/lib/profile/types";

function makeProfile(overrides: Partial<UserProfileViewModel> = {}): UserProfileViewModel {
  return {
    id: "usr_1",
    name: "Morgan Lee",
    email: "morgan@example.com",
    credential: "Enterprise AI practitioner",
    affiliateEnabled: true,
    referralCode: "mentor-42",
    referralUrl: "https://studioordo.com/?ref=mentor-42",
    qrCodeUrl: "/api/qr/mentor-42",
    roles: ["APPRENTICE"],
    ...overrides,
  };
}

describe("user profile tools", () => {
  it("returns the current profile for authenticated users", async () => {
    const service = { getProfile: vi.fn().mockResolvedValue(makeProfile()), updateProfile: vi.fn() };
    const tool = createGetMyProfileTool(service);

    const result = await tool.command.execute({}, { role: "APPRENTICE", userId: "usr_1" });

    expect(result).toMatchObject({
      action: "get_my_profile",
      profile: expect.objectContaining({ referral_code: "mentor-42" }),
    });
    expect(service.getProfile).toHaveBeenCalledWith("usr_1");
  });

  it("updates the current profile through the shared service", async () => {
    const service = {
      getProfile: vi.fn(),
      updateProfile: vi.fn().mockResolvedValue(makeProfile({ name: "Morgan A. Lee" })),
    };
    const tool = createUpdateMyProfileTool(service);

    const result = await tool.command.execute(
      { name: "Morgan A. Lee", credential: "AI strategist" },
      { role: "AUTHENTICATED", userId: "usr_1" },
    );

    expect(service.updateProfile).toHaveBeenCalledWith("usr_1", {
      name: "Morgan A. Lee",
      email: undefined,
      credential: "AI strategist",
    });
    expect(result).toMatchObject({
      action: "update_my_profile",
      profile: expect.objectContaining({ name: "Morgan A. Lee" }),
    });
  });

  it("returns the referral QR details when affiliate access exists", async () => {
    const service = { getProfile: vi.fn().mockResolvedValue(makeProfile()), updateProfile: vi.fn() };
    const tool = createGetMyReferralQrTool(service);

    const result = await tool.command.execute({}, { role: "APPRENTICE", userId: "usr_1" });

    expect(result).toMatchObject({
      action: "get_my_referral_qr",
      qr_code_url: "/api/qr/mentor-42",
      manage_route: "/profile",
    });
  });

  it("reports when referral QR access is not enabled", async () => {
    const service = {
      getProfile: vi.fn().mockResolvedValue(makeProfile({ affiliateEnabled: false, referralCode: null, referralUrl: null, qrCodeUrl: null })),
      updateProfile: vi.fn(),
    };
    const tool = createGetMyReferralQrTool(service);

    const result = await tool.command.execute({}, { role: "AUTHENTICATED", userId: "usr_1" });

    expect(result).toMatchObject({
      action: "get_my_referral_qr",
      error: "Referral QR access is not enabled for this account yet.",
    });
  });

  it("rejects anonymous access", async () => {
    const service = { getProfile: vi.fn(), updateProfile: vi.fn() };
    const tool = createGetMyProfileTool(service);

    const result = await tool.command.execute({}, { role: "ANONYMOUS", userId: "usr_anon" });

    expect(result).toMatchObject({ error: expect.stringContaining("Authentication required") });
    expect(service.getProfile).not.toHaveBeenCalled();
  });
});