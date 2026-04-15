"use client";

import { useEffect, useRef, useState, type Dispatch } from "react";

import type { RoleName } from "@/core/entities/user";
import {
  createInitialChatMessages,
  type ReferralContext,
  type ChatAction,
} from "@/hooks/chat/chatState";
import { buildReferralContext } from "@/hooks/chat/chatBootstrap";
import type { InstancePrompts } from "@/lib/config/defaults";

export function useReferralContext(
  initialRole: RoleName,
  prompts: InstancePrompts,
  dispatch: Dispatch<ChatAction>,
  canResolveReferralVisit = true,
): ReferralContext | undefined {
  const [referralCtx, setReferralCtx] = useState<ReferralContext | undefined>(undefined);
  const referralResolved = useRef(false);

  useEffect(() => {
    if (referralResolved.current || initialRole !== "ANONYMOUS" || !canResolveReferralVisit) return;
    referralResolved.current = true;

    fetch("/api/referral/visit")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        const ctx = buildReferralContext(data as Parameters<typeof buildReferralContext>[0]);
        if (!ctx) return;
        setReferralCtx(ctx);
        dispatch({
          type: "REPLACE_ALL",
          messages: createInitialChatMessages(initialRole, prompts, ctx),
        });
      })
      .catch(() => { /* fall back to default greeting */ });
  }, [canResolveReferralVisit, initialRole, prompts, dispatch]);

  return referralCtx;
}
