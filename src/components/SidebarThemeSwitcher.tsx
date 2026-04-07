"use client";

import { useSyncExternalStore } from "react";

import { ThemeSwitcher } from "./ThemeSwitcher";

function subscribe() {
  return () => {};
}

export function SidebarThemeSwitcher() {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  if (!mounted) {
    return <div className="library-sidebar-theme-placeholder" aria-hidden="true" />;
  }

  return <ThemeSwitcher />;
}