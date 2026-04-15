"use client";

import React from "react";
import type { ToolPluginProps } from "../../registry/types";
import { resolveCapabilityDisplayLabel } from "../../registry/capability-presentation-registry";
import { CapabilityActionRail } from "../../primitives/CapabilityActionRail";
import { CapabilityArtifactRail } from "../../primitives/CapabilityArtifactRail";
import { CapabilityCardHeader } from "../../primitives/CapabilityCardHeader";
import { CapabilityCardShell } from "../../primitives/CapabilityCardShell";
import { CapabilityContextPanel } from "../../primitives/CapabilityContextPanel";
import { JobStatusFallbackCard } from "../system/JobStatusFallbackCard";

type ReferralQrResult =
  | {
      action: "get_my_referral_qr";
      message?: string;
      referral_code: string;
      referral_url: string;
      qr_code_url: string;
      manage_route?: string;
    }
  | {
      action: "get_my_referral_qr";
      error: string;
      affiliate_enabled?: boolean;
      manage_route?: string;
    };

function isReferralQrResult(value: unknown): value is ReferralQrResult {
  if (
    typeof value !== "object"
    || value === null
    || (value as { action?: unknown }).action !== "get_my_referral_qr"
  ) {
    return false;
  }

  if (typeof (value as { error?: unknown }).error === "string") {
    return true;
  }

  return (
    typeof (value as { referral_code?: unknown }).referral_code === "string"
    && typeof (value as { referral_url?: unknown }).referral_url === "string"
    && typeof (value as { qr_code_url?: unknown }).qr_code_url === "string"
  );
}

export const ReferralQrCard: React.FC<ToolPluginProps> = (props) => {
  const { toolCall, resultEnvelope, part, computedActions = [], onActionClick } = props;
  const result = resultEnvelope?.payload ?? toolCall?.result;
  const label = resolveCapabilityDisplayLabel({
    toolName: toolCall?.name,
    explicitLabel: part?.label,
    descriptorLabel: props.descriptor?.label,
    fallbackLabel: "Referral QR",
  });
  const sharedShellProps = {
    descriptor: props.descriptor,
    state: part?.status ?? "succeeded",
    ariaLabel: `${label} result`,
  } as const;

  if (!toolCall || !isReferralQrResult(result)) {
    return <JobStatusFallbackCard {...props} />;
  }

  if ("error" in result) {
    return (
      <CapabilityCardShell {...sharedShellProps}>
        <CapabilityCardHeader eyebrow={label} title="Referral QR" statusLabel="Unavailable" />
        <p className="ui-capability-card-summary">{result.error}</p>
        <CapabilityArtifactRail
          title="Referral workspace"
          items={[{ label: "Open referrals", href: result.manage_route ?? "/profile", meta: "Manage referral access" }]}
        />
        <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  return (
    <CapabilityCardShell {...sharedShellProps}>
      <CapabilityCardHeader eyebrow={label} title={result.referral_code} statusLabel="Ready" />
      <p className="ui-capability-card-summary">
        {result.message ?? "Returned the referral link and QR image for this account."}
      </p>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/70">
        <img
          src={result.qr_code_url}
          alt={`QR code for ${result.referral_code}`}
          className="h-auto w-full max-w-sm object-contain"
        />
      </div>
      <CapabilityContextPanel
        items={[
          { label: "Referral code", value: result.referral_code },
          { label: "Manage route", value: result.manage_route ?? "/profile" },
        ]}
      />
      <CapabilityArtifactRail
        title="Share assets"
        items={[
          { label: "Open referral link", href: result.referral_url, meta: "Share route" },
          { label: "Open QR image", href: result.qr_code_url, meta: "Image asset" },
          { label: "Open referrals", href: result.manage_route ?? "/profile", meta: "Manage workspace" },
        ]}
      />
      <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
    </CapabilityCardShell>
  );
};
