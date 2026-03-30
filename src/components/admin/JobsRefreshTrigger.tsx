"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Lightweight client component that polls and calls router.refresh()
 * to keep the RSC jobs list current without SSE.
 */
export function JobsRefreshTrigger({ intervalMs = 10_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);

  return null;
}
