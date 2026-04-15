import React from "react";

import type { ToolPluginProps } from "../../registry/types";

import { CapabilityErrorCard } from "./CapabilityErrorCard";
import { SystemJobCard } from "./SystemJobCard";
import { hasInlineToolCallError } from "./resolve-system-card";

export const JobStatusFallbackCard: React.FC<ToolPluginProps> = (props) => {
  if (!props.part && !props.toolCall) {
    return null;
  }

  if (
    props.part?.status === "failed"
    || props.part?.status === "canceled"
    || (!props.part && hasInlineToolCallError(props.toolCall?.result))
  ) {
    return <CapabilityErrorCard {...props} />;
  }

  return <SystemJobCard {...props} />;
};
