"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_IDENTITY, DEFAULT_PROMPTS, type InstanceIdentity, type InstancePrompts } from "@/lib/config/defaults";

interface InstanceConfigContextValue {
  identity: InstanceIdentity;
  prompts: InstancePrompts;
}

const InstanceConfigContext = createContext<InstanceConfigContextValue>({
  identity: DEFAULT_IDENTITY,
  prompts: DEFAULT_PROMPTS,
});

export function useInstanceIdentity(): InstanceIdentity {
  return useContext(InstanceConfigContext).identity;
}

export function useInstancePrompts(): InstancePrompts {
  return useContext(InstanceConfigContext).prompts;
}

export function InstanceConfigProvider({
  identity,
  prompts,
  children,
}: {
  identity: InstanceIdentity;
  prompts?: InstancePrompts;
  children: ReactNode;
}) {
  return (
    <InstanceConfigContext.Provider value={{ identity, prompts: prompts ?? DEFAULT_PROMPTS }}>
      {children}
    </InstanceConfigContext.Provider>
  );
}
