"use client";

import { useEffect } from "react";

interface ReferralVisitActivatorProps {
  code: string;
}

export function ReferralVisitActivator({ code }: ReferralVisitActivatorProps) {
  useEffect(() => {
    const controller = new AbortController();

    void fetch(`/api/referral/${encodeURIComponent(code)}`, {
      method: "POST",
      signal: controller.signal,
    }).catch(() => undefined);

    return () => {
      controller.abort();
    };
  }, [code]);

  return null;
}
