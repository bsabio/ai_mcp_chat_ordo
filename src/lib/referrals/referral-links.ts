export function buildReferralPath(referralCode: string): string {
  return `/r/${encodeURIComponent(referralCode)}`;
}

export function buildReferralUrl(domain: string, referralCode: string): string {
  return `https://${domain}${buildReferralPath(referralCode)}`;
}
