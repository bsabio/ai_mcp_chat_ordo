import { afterEach, describe, expect, it } from "vitest";

import { buildMediaQuotaSnapshot, getMediaQuotaPolicy } from "@/lib/storage/media-quota-policy";

const ORIGINAL_ENV = {
  MEDIA_DEFAULT_USER_QUOTA_BYTES: process.env.MEDIA_DEFAULT_USER_QUOTA_BYTES,
  MEDIA_HARD_BLOCK_UPLOADS_AT_QUOTA: process.env.MEDIA_HARD_BLOCK_UPLOADS_AT_QUOTA,
  MEDIA_QUOTA_WARN_AT_PERCENT: process.env.MEDIA_QUOTA_WARN_AT_PERCENT,
};

afterEach(() => {
  process.env.MEDIA_DEFAULT_USER_QUOTA_BYTES = ORIGINAL_ENV.MEDIA_DEFAULT_USER_QUOTA_BYTES;
  process.env.MEDIA_HARD_BLOCK_UPLOADS_AT_QUOTA = ORIGINAL_ENV.MEDIA_HARD_BLOCK_UPLOADS_AT_QUOTA;
  process.env.MEDIA_QUOTA_WARN_AT_PERCENT = ORIGINAL_ENV.MEDIA_QUOTA_WARN_AT_PERCENT;
});

describe("media quota policy", () => {
  it("uses stable defaults when media quota env vars are absent", () => {
    delete process.env.MEDIA_DEFAULT_USER_QUOTA_BYTES;
    delete process.env.MEDIA_HARD_BLOCK_UPLOADS_AT_QUOTA;
    delete process.env.MEDIA_QUOTA_WARN_AT_PERCENT;

    expect(getMediaQuotaPolicy()).toEqual({
      defaultUserQuotaBytes: 10 * 1024 * 1024 * 1024,
      hardBlockUploadsAtQuota: false,
      warnAtPercent: 80,
    });
  });

  it("accepts configured quota values and warning thresholds", () => {
    process.env.MEDIA_DEFAULT_USER_QUOTA_BYTES = "2048";
    process.env.MEDIA_HARD_BLOCK_UPLOADS_AT_QUOTA = "true";
    process.env.MEDIA_QUOTA_WARN_AT_PERCENT = "70";

    expect(getMediaQuotaPolicy()).toEqual({
      defaultUserQuotaBytes: 2048,
      hardBlockUploadsAtQuota: true,
      warnAtPercent: 70,
    });
  });

  it("falls back safely when quota config is invalid", () => {
    process.env.MEDIA_DEFAULT_USER_QUOTA_BYTES = "0";
    process.env.MEDIA_HARD_BLOCK_UPLOADS_AT_QUOTA = "maybe";
    process.env.MEDIA_QUOTA_WARN_AT_PERCENT = "100";

    expect(getMediaQuotaPolicy()).toEqual({
      defaultUserQuotaBytes: 10 * 1024 * 1024 * 1024,
      hardBlockUploadsAtQuota: false,
      warnAtPercent: 80,
    });
  });

  it("builds warning and over-quota snapshots deterministically", () => {
    const warning = buildMediaQuotaSnapshot(800, {
      defaultUserQuotaBytes: 1000,
      hardBlockUploadsAtQuota: false,
      warnAtPercent: 80,
    });
    const overQuota = buildMediaQuotaSnapshot(1200, {
      defaultUserQuotaBytes: 1000,
      hardBlockUploadsAtQuota: false,
      warnAtPercent: 80,
    });

    expect(warning).toMatchObject({
      quotaBytes: 1000,
      usedBytes: 800,
      remainingBytes: 200,
      percentUsed: 80,
      isWarning: true,
      isOverQuota: false,
      status: "warning",
    });
    expect(overQuota).toMatchObject({
      quotaBytes: 1000,
      usedBytes: 1200,
      remainingBytes: 0,
      percentUsed: 120,
      isWarning: false,
      isOverQuota: true,
      status: "over_quota",
    });
  });
});