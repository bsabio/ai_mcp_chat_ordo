"use client";

import React from "react";
import type { ToolPluginProps } from "../../registry/types";
import { resolveCapabilityDisplayLabel } from "../../registry/capability-presentation-registry";
import { CapabilityActionRail } from "../../primitives/CapabilityActionRail";
import { CapabilityArtifactRail } from "../../primitives/CapabilityArtifactRail";
import { CapabilityCardHeader } from "../../primitives/CapabilityCardHeader";
import { CapabilityCardShell } from "../../primitives/CapabilityCardShell";
import { CapabilityContextPanel } from "../../primitives/CapabilityContextPanel";
import { CapabilityDisclosure } from "../../primitives/CapabilityDisclosure";
import { CapabilityMetricStrip } from "../../primitives/CapabilityMetricStrip";
import { JobStatusFallbackCard } from "../system/JobStatusFallbackCard";

type ProfileResult = {
  action: "get_my_profile" | "update_my_profile";
  message?: string;
  profile: {
    id: string;
    name: string;
    email: string;
    credential?: string | null;
    push_notifications_enabled?: boolean;
    affiliate_enabled: boolean;
    referral_code?: string | null;
    referral_url?: string | null;
    qr_code_url?: string | null;
    roles?: string[];
  };
};

type PreferenceResult =
  | {
      action: "set_preference";
      key: string;
      value: string;
      message: string;
    }
  | {
      error: string;
    };

type AffiliateSummaryResult = {
  action: "get_my_affiliate_summary";
  message: string;
  manage_route: string;
  summary: {
    introductions: number;
    started_chats: number;
    registered: number;
    qualified_opportunities: number;
    credit_status_label: string;
    credit_status_counts: Record<string, number>;
    narrative: string;
  };
  pipeline: {
    stages: Array<{ label?: string; count?: number; value?: number; stage?: string }>;
    outcomes: Array<{ label?: string; count?: number; value?: number; outcome?: string }>;
  };
};

type AffiliateToolError = {
  action: "get_my_affiliate_summary" | "list_my_referral_activity";
  error: string;
  affiliate_enabled: false;
  manage_route: string;
};

type ReferralActivityResult = {
  action: "list_my_referral_activity";
  message: string;
  manage_route: string;
  activities: Array<{
    id: string;
    referral_id: string;
    referral_code: string;
    milestone: string;
    title: string;
    description: string;
    occurred_at: string;
    href: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function detailValue(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function createContextItems(items: Array<{ label: string; value: React.ReactNode }>) {
  return items.filter((item) => item.value != null && item.value !== false && item.value !== "");
}

function formatKey(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function parsePreferenceResult(value: unknown): PreferenceResult | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as PreferenceResult;
    if (!isRecord(parsed)) {
      return null;
    }

    if (
      (parsed as { action?: unknown }).action === "set_preference"
      && typeof (parsed as { key?: unknown }).key === "string"
      && typeof (parsed as { value?: unknown }).value === "string"
      && typeof (parsed as { message?: unknown }).message === "string"
    ) {
      return parsed as PreferenceResult;
    }

    if (typeof (parsed as { error?: unknown }).error === "string") {
      return parsed as PreferenceResult;
    }

    return null;
  } catch {
    return null;
  }
}

function isProfileResult(value: unknown): value is ProfileResult {
  return (
    typeof value === "object"
    && value !== null
    && ((value as { action?: unknown }).action === "get_my_profile"
      || (value as { action?: unknown }).action === "update_my_profile")
    && "profile" in value
    && typeof (value as { profile?: unknown }).profile === "object"
    && (value as { profile?: unknown }).profile !== null
  );
}

function isAffiliateSummaryResult(value: unknown): value is AffiliateSummaryResult {
  return (
    isRecord(value)
    && value.action === "get_my_affiliate_summary"
    && isRecord(value.summary)
    && isRecord(value.pipeline)
    && Array.isArray(value.pipeline.stages)
    && Array.isArray(value.pipeline.outcomes)
  );
}

function isAffiliateToolError(value: unknown): value is AffiliateToolError {
  return (
    isRecord(value)
    && (value.action === "get_my_affiliate_summary" || value.action === "list_my_referral_activity")
    && typeof value.error === "string"
  );
}

function isReferralActivityResult(value: unknown): value is ReferralActivityResult {
  return (
    isRecord(value)
    && value.action === "list_my_referral_activity"
    && typeof value.message === "string"
    && Array.isArray(value.activities)
  );
}

export const ProfileCard: React.FC<ToolPluginProps> = (props) => {
  const { toolCall, resultEnvelope, part, computedActions = [], onActionClick } = props;
  const result = resultEnvelope?.payload ?? toolCall?.result;
  const label = resolveCapabilityDisplayLabel({
    toolName: toolCall?.name,
    explicitLabel: part?.label,
    descriptorLabel: props.descriptor?.label,
    fallbackLabel: "Profile",
  });
  const state = part?.status ?? "succeeded";
  const sharedShellProps = {
    descriptor: props.descriptor,
    state,
    ariaLabel: `${label} result`,
  } as const;

  if (!toolCall) {
    return <JobStatusFallbackCard {...props} />;
  }

  if (isProfileResult(result)) {
    const { action, message, profile } = result;

    return (
      <CapabilityCardShell {...sharedShellProps}>
        <CapabilityCardHeader
          eyebrow={label}
          title={profile.name}
          statusLabel={profile.affiliate_enabled ? "Affiliate enabled" : "Standard account"}
        />
        <p className="ui-capability-card-summary">
          {message ?? (action === "update_my_profile" ? "Updated the current profile." : "Loaded the current profile.")}
        </p>
        <CapabilityMetricStrip
          items={[
            { label: "Roles", value: String((profile.roles ?? []).length) },
            { label: "Push notifications", value: profile.push_notifications_enabled ? "Enabled" : "Disabled" },
            { label: "Referral access", value: profile.affiliate_enabled ? "Enabled" : "Not enabled" },
          ]}
        />
        <CapabilityContextPanel
          items={createContextItems([
            { label: "Email", value: profile.email },
            { label: "Credential", value: detailValue(profile.credential) ?? "Not set" },
            { label: "Roles", value: (profile.roles ?? []).join(", ") || "None" },
            { label: "Referral code", value: detailValue(profile.referral_code) ?? "Not assigned" },
          ])}
        />
        <CapabilityArtifactRail
          title="Account links"
          items={[
            profile.referral_url
              ? { label: "Referral link", href: profile.referral_url, meta: "Share route" }
              : { label: "Referral link unavailable", meta: "No referral route assigned" },
            profile.qr_code_url
              ? { label: "Referral QR image", href: profile.qr_code_url, meta: "Image asset" }
              : { label: "Referral QR unavailable", meta: "No QR asset yet" },
          ]}
        />
        <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  const preferenceResult = parsePreferenceResult(result);
  if (preferenceResult) {

    if ("error" in preferenceResult) {
      return (
        <CapabilityCardShell {...sharedShellProps} state="failed">
          <CapabilityCardHeader eyebrow={label} title="Preference not saved" statusLabel="Sign in required" />
          <p className="ui-capability-card-summary">{preferenceResult.error}</p>
          <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
        </CapabilityCardShell>
      );
    }

    return (
      <CapabilityCardShell {...sharedShellProps}>
        <CapabilityCardHeader eyebrow={label} title="Preference updated" statusLabel="Saved" />
        <p className="ui-capability-card-summary">{preferenceResult.message}</p>
        <CapabilityContextPanel
          items={createContextItems([
            { label: "Key", value: formatKey(preferenceResult.key) },
            { label: "Value", value: preferenceResult.value },
          ])}
        />
        <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  if (isAffiliateSummaryResult(result)) {
    return (
      <CapabilityCardShell {...sharedShellProps}>
        <CapabilityCardHeader
          eyebrow={label}
          title="Affiliate summary"
          statusLabel={detailValue(result.summary.credit_status_label) ?? "Referral analytics"}
        />
        <p className="ui-capability-card-summary">{result.summary.narrative || result.message}</p>
        <CapabilityMetricStrip
          items={[
            { label: "Introductions", value: String(result.summary.introductions) },
            { label: "Chats", value: String(result.summary.started_chats) },
            { label: "Registered", value: String(result.summary.registered) },
            { label: "Qualified", value: String(result.summary.qualified_opportunities) },
          ]}
        />
        <CapabilityArtifactRail
          title="Referral workspace"
          items={[{ label: "Open referrals", href: result.manage_route, meta: "Account workspace" }]}
        />
        <CapabilityDisclosure label="Pipeline details">
          <div className="flex flex-col gap-(--space-2)">
            <p className="text-sm font-medium text-foreground">Stages</p>
            <ul className="flex flex-col gap-(--space-2)">
              {result.pipeline.stages.map((stage, index) => (
                <li key={`stage-${index}`} className="ui-capability-context-item">
                  <p className="text-sm text-foreground/72">
                    {(typeof stage.label === "string" && stage.label) || (typeof stage.stage === "string" && formatKey(stage.stage)) || `Stage ${index + 1}`}: {String(stage.count ?? stage.value ?? 0)}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-sm font-medium text-foreground">Outcomes</p>
            <ul className="flex flex-col gap-(--space-2)">
              {result.pipeline.outcomes.map((outcome, index) => (
                <li key={`outcome-${index}`} className="ui-capability-context-item">
                  <p className="text-sm text-foreground/72">
                    {(typeof outcome.label === "string" && outcome.label) || (typeof outcome.outcome === "string" && formatKey(outcome.outcome)) || `Outcome ${index + 1}`}: {String(outcome.count ?? outcome.value ?? 0)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </CapabilityDisclosure>
        <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  if (isAffiliateToolError(result)) {
    return (
      <CapabilityCardShell {...sharedShellProps}>
        <CapabilityCardHeader eyebrow={label} title="Referral self-service" statusLabel="Unavailable" />
        <p className="ui-capability-card-summary">{result.error}</p>
        <CapabilityArtifactRail
          title="Referral workspace"
          items={[{ label: "Open referrals", href: result.manage_route, meta: "Account workspace" }]}
        />
        <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  if (isReferralActivityResult(result)) {
    return (
      <CapabilityCardShell {...sharedShellProps}>
        <CapabilityCardHeader
          eyebrow={label}
          title="Referral activity"
          statusLabel={`${result.activities.length} event${result.activities.length === 1 ? "" : "s"}`}
        />
        <p className="ui-capability-card-summary">{result.message}</p>
        <CapabilityArtifactRail
          title="Recent activity"
          items={result.activities.slice(0, 6).map((activity) => ({
            id: activity.id,
            label: activity.title,
            href: activity.href,
            meta: `${formatKey(activity.milestone)} · ${activity.occurred_at}`,
          }))}
        />
        <CapabilityDisclosure label="Activity details">
          <ul className="flex flex-col gap-(--space-2)">
            {result.activities.map((activity) => (
              <li key={activity.id} className="ui-capability-context-item">
                <p className="text-sm font-medium text-foreground">{activity.title}</p>
                <p className="mt-(--space-2) text-sm text-foreground/72">{activity.description}</p>
                <p className="mt-(--space-2) text-xs text-foreground/56">{activity.occurred_at}</p>
              </li>
            ))}
          </ul>
        </CapabilityDisclosure>
        <CapabilityArtifactRail
          title="Referral workspace"
          items={[{ label: "Open referrals", href: result.manage_route, meta: "Account workspace" }]}
        />
        <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  return <JobStatusFallbackCard {...props} />;
};
