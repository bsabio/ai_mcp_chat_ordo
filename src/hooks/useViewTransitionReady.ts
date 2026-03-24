"use client";

import { useEffect, useMemo, useState } from "react";

import { supportsReducedMotion, supportsViewTransitions } from "@/lib/ui/browserSupport";

export function useViewTransitionReady(): boolean {
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsClientReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return useMemo(
    () => isClientReady && supportsViewTransitions() && !supportsReducedMotion(),
    [isClientReady],
  );
}
