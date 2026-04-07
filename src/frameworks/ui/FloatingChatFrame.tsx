"use client";

import React from "react";

interface FloatingChatFrameProps {
  canUseViewTransitions: boolean;
  children: React.ReactNode;
  isFullScreen: boolean;
  routeTone?: "default" | "quiet";
}

function getFloatingContainerClasses(): string {
  const layoutRows = "grid-rows-[auto_minmax(0,1fr)_auto]";

  return `glass-surface fixed z-60 grid min-h-0 overflow-hidden border-theme shadow-[-40px_40px_80px_rgba(0,0,0,0.5)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${layoutRows}`;
}

export function FloatingChatFrame({
  canUseViewTransitions,
  children,
  isFullScreen,
  routeTone = "default",
}: FloatingChatFrameProps) {
  const sectionStyle: React.CSSProperties = {};

  if (canUseViewTransitions) {
    sectionStyle.viewTransitionName = "chat-container";
  }

  return (
    <section
      className={getFloatingContainerClasses()}
      style={sectionStyle}
      data-chat-container-mode="floating"
      data-chat-floating-shell="true"
      data-chat-shell-kind="floating"
      data-chat-shell-size={isFullScreen ? "fullscreen" : "default"}
      data-chat-route-tone={routeTone}
    >
      {children}
    </section>
  );
}