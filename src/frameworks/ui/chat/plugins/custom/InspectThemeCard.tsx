"use client";

import React from "react";
import type { ToolPluginProps } from "../../registry/types";
import { resolveCapabilityDisplayLabel } from "../../registry/capability-presentation-registry";
import { CapabilityActionRail } from "../../primitives/CapabilityActionRail";
import { CapabilityCardHeader } from "../../primitives/CapabilityCardHeader";
import { CapabilityCardShell } from "../../primitives/CapabilityCardShell";
import { CapabilityContextPanel } from "../../primitives/CapabilityContextPanel";
import { CapabilityDisclosure } from "../../primitives/CapabilityDisclosure";
import { CapabilityMetricStrip } from "../../primitives/CapabilityMetricStrip";
import { JobStatusFallbackCard } from "../system/JobStatusFallbackCard";

type ThemeProfile = {
  id: string;
  name: string;
  motionIntent: string;
  shadowIntent: string;
  densityDefaults: { standard: string; dataDense: string; touch: string };
  primaryAttributes: readonly string[];
};

type ControlAxis = {
  id: string;
  label: string;
  options: readonly unknown[];
  defaultValue: unknown;
  mutationTools: readonly string[];
};

type InspectThemeResult = {
  action: "inspect_theme";
  message: string;
  supported_theme_ids: readonly string[];
  ordered_theme_profiles: readonly ThemeProfile[];
  approved_control_axes: readonly ControlAxis[];
  active_theme_state: { available: boolean; reason: string };
};

function isInspectThemeResult(value: unknown): value is InspectThemeResult {
  return (
    typeof value === "object"
    && value !== null
    && (value as { action?: unknown }).action === "inspect_theme"
    && Array.isArray((value as { supported_theme_ids?: unknown }).supported_theme_ids)
    && Array.isArray((value as { ordered_theme_profiles?: unknown }).ordered_theme_profiles)
    && Array.isArray((value as { approved_control_axes?: unknown }).approved_control_axes)
    && typeof (value as { active_theme_state?: unknown }).active_theme_state === "object"
    && (value as { active_theme_state?: unknown }).active_theme_state !== null
  );
}

function formatAxisOption(option: unknown): string {
  if (typeof option === "string") return option;
  if (typeof option === "boolean") return option ? "true" : "false";
  return String(option);
}

function createContextItems(items: Array<{ label: string; value: React.ReactNode }>) {
  return items.filter((item) => item.value != null && item.value !== false && item.value !== "");
}

function countAppliedAdjustments(args: Record<string, unknown>): number {
  return Object.values(args).filter((value) => value !== undefined && value !== null && value !== "").length;
}

export const InspectThemeCard: React.FC<ToolPluginProps> = (props) => {
  const { toolCall, resultEnvelope, part, computedActions = [], onActionClick } = props;
  const result = resultEnvelope?.payload ?? toolCall?.result;
  const label = resolveCapabilityDisplayLabel({
    toolName: toolCall?.name,
    explicitLabel: part?.label,
    descriptorLabel: props.descriptor?.label,
    fallbackLabel: "Theme",
  });
  const sharedShellProps = {
    descriptor: props.descriptor,
    state: part?.status ?? "succeeded",
    ariaLabel: `${label} result`,
  } as const;

  if (!toolCall) {
    return <JobStatusFallbackCard {...props} />;
  }

  if (isInspectThemeResult(result)) {
    return (
      <CapabilityCardShell {...sharedShellProps}>
        <CapabilityCardHeader
          eyebrow={label}
          title="Theme Profiles"
          statusLabel={`${result.supported_theme_ids.length} themes`}
        />
        <p className="ui-capability-card-summary">{result.message}</p>
        <CapabilityMetricStrip
          items={[
            { label: "Themes", value: String(result.supported_theme_ids.length) },
            { label: "Control axes", value: String(result.approved_control_axes.length) },
            { label: "Active theme", value: result.active_theme_state.available ? "Available" : "Unavailable" },
          ]}
        />
        <CapabilityContextPanel
          items={createContextItems([
            { label: "Supported theme ids", value: result.supported_theme_ids.join(", ") },
            { label: "Client state", value: result.active_theme_state.reason },
          ])}
        />
        <CapabilityDisclosure label="Theme profiles">
          <ul className="flex flex-col gap-(--space-2)">
            {result.ordered_theme_profiles.map((profile) => (
              <li key={profile.id} className="ui-capability-context-item">
                <p className="text-sm font-medium text-foreground">{profile.name} ({profile.id})</p>
                <p className="mt-(--space-2) text-sm text-foreground/72">
                  {profile.motionIntent} motion · {profile.shadowIntent} depth · standard {profile.densityDefaults.standard}, data-dense {profile.densityDefaults.dataDense}, touch {profile.densityDefaults.touch}
                </p>
                <p className="mt-(--space-2) text-sm text-foreground/72">{profile.primaryAttributes.join(", ")}</p>
              </li>
            ))}
          </ul>
        </CapabilityDisclosure>
        <CapabilityDisclosure label="Approved control axes">
          <ul className="flex flex-col gap-(--space-2)">
            {result.approved_control_axes.map((axis) => (
              <li key={axis.id} className="ui-capability-context-item">
                <p className="text-sm font-medium text-foreground">{axis.label}</p>
                <p className="mt-(--space-2) text-sm text-foreground/72">
                  Default {formatAxisOption(axis.defaultValue)} · Options {axis.options.map(formatAxisOption).join(", ")} · Mutated by {axis.mutationTools.join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </CapabilityDisclosure>
        <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  if (toolCall.name === "set_theme" && typeof result === "string") {
    return (
      <CapabilityCardShell {...sharedShellProps}>
        <CapabilityCardHeader
          eyebrow={label}
          title={typeof toolCall.args.theme === "string" ? toolCall.args.theme : "Theme updated"}
          statusLabel="Applied"
        />
        <p className="ui-capability-card-summary">{result}</p>
        <CapabilityContextPanel
          items={createContextItems([
            {
              label: "Theme",
              value: typeof toolCall.args.theme === "string" ? toolCall.args.theme : null,
            },
          ])}
        />
        <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  if (toolCall.name === "adjust_ui" && typeof result === "string") {
    return (
      <CapabilityCardShell {...sharedShellProps}>
        <CapabilityCardHeader eyebrow={label} title="UI adjustments" statusLabel="Applied" />
        <p className="ui-capability-card-summary">{result}</p>
        <CapabilityMetricStrip
          items={[
            { label: "Changes", value: String(countAppliedAdjustments(toolCall.args)) },
          ]}
        />
        <CapabilityContextPanel
          items={createContextItems([
            { label: "Preset", value: typeof toolCall.args.preset === "string" ? toolCall.args.preset : null },
            { label: "Theme", value: typeof toolCall.args.theme === "string" ? toolCall.args.theme : null },
            { label: "Font size", value: typeof toolCall.args.fontSize === "string" ? toolCall.args.fontSize : null },
            { label: "Density", value: typeof toolCall.args.density === "string" ? toolCall.args.density : null },
            { label: "Line height", value: typeof toolCall.args.lineHeight === "string" ? toolCall.args.lineHeight : null },
            { label: "Letter spacing", value: typeof toolCall.args.letterSpacing === "string" ? toolCall.args.letterSpacing : null },
            { label: "Dark mode", value: typeof toolCall.args.dark === "boolean" ? (toolCall.args.dark ? "true" : "false") : null },
            { label: "Color blind mode", value: typeof toolCall.args.colorBlindMode === "string" ? toolCall.args.colorBlindMode : null },
          ])}
        />
        <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  return <JobStatusFallbackCard {...props} />;
};
