"use client";

import React from "react";
import type { ToolPluginProps } from "../../registry/types";

import { CapabilityErrorCard } from "./CapabilityErrorCard";

export const ErrorCard: React.FC<ToolPluginProps> = (props) => {
  const status = props.part?.status ?? "failed";

  if (status !== "failed" && status !== "canceled") {
    return null;
  }

  return <CapabilityErrorCard {...props} />;
};
