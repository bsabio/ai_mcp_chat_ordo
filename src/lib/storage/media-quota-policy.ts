const DEFAULT_MEDIA_QUOTA_BYTES = 10 * 1024 * 1024 * 1024;
const DEFAULT_MEDIA_QUOTA_WARN_AT_PERCENT = 80;

export interface MediaQuotaPolicy {
  defaultUserQuotaBytes: number;
  hardBlockUploadsAtQuota: boolean;
  warnAtPercent: number;
}

export interface MediaQuotaSnapshot {
  quotaBytes: number;
  usedBytes: number;
  remainingBytes: number;
  percentUsed: number;
  warnAtPercent: number;
  hardBlockUploadsAtQuota: boolean;
  isWarning: boolean;
  isOverQuota: boolean;
  status: "normal" | "warning" | "over_quota";
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parsePercent(value: string | undefined, fallback: number): number {
  const parsed = parsePositiveInteger(value, fallback);
  if (parsed <= 0 || parsed >= 100) {
    return fallback;
  }

  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

export function getMediaQuotaPolicy(): MediaQuotaPolicy {
  return {
    defaultUserQuotaBytes: parsePositiveInteger(
      process.env.MEDIA_DEFAULT_USER_QUOTA_BYTES?.trim(),
      DEFAULT_MEDIA_QUOTA_BYTES,
    ),
    hardBlockUploadsAtQuota: parseBoolean(
      process.env.MEDIA_HARD_BLOCK_UPLOADS_AT_QUOTA?.trim(),
      false,
    ),
    warnAtPercent: parsePercent(
      process.env.MEDIA_QUOTA_WARN_AT_PERCENT?.trim(),
      DEFAULT_MEDIA_QUOTA_WARN_AT_PERCENT,
    ),
  };
}

export function buildMediaQuotaSnapshot(
  usedBytes: number,
  policy: MediaQuotaPolicy = getMediaQuotaPolicy(),
): MediaQuotaSnapshot {
  const normalizedUsedBytes = Number.isFinite(usedBytes) && usedBytes > 0 ? usedBytes : 0;
  const quotaBytes = Number.isFinite(policy.defaultUserQuotaBytes) && policy.defaultUserQuotaBytes > 0
    ? policy.defaultUserQuotaBytes
    : DEFAULT_MEDIA_QUOTA_BYTES;
  const remainingBytes = Math.max(quotaBytes - normalizedUsedBytes, 0);
  const percentUsed = quotaBytes > 0 ? Math.min((normalizedUsedBytes / quotaBytes) * 100, 999) : 0;
  const isOverQuota = normalizedUsedBytes > quotaBytes;
  const isWarning = !isOverQuota && percentUsed >= policy.warnAtPercent;

  return {
    quotaBytes,
    usedBytes: normalizedUsedBytes,
    remainingBytes,
    percentUsed,
    warnAtPercent: policy.warnAtPercent,
    hardBlockUploadsAtQuota: policy.hardBlockUploadsAtQuota,
    isWarning,
    isOverQuota,
    status: isOverQuota ? "over_quota" : isWarning ? "warning" : "normal",
  };
}