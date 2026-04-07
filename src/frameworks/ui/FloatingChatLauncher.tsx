"use client";

import { useInstanceIdentity } from "@/lib/config/InstanceConfigContext";

interface FloatingChatLauncherProps {
  onOpen: () => void;
  routeTone?: "default" | "quiet";
}

export function FloatingChatLauncher({ onOpen, routeTone = "default" }: FloatingChatLauncherProps) {
  const identity = useInstanceIdentity();

  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed z-60 flex items-center justify-center overflow-hidden rounded-full accent-interactive-fill shadow-[-20px_20px_60px_rgba(0,0,0,0.4)] transition-all duration-300 group active:scale-95 focus-ring hover:scale-[1.04]"
      aria-label={`Open ${identity.name} chat`}
      data-chat-fab-launcher="true"
      data-chat-fab-state="idle"
      data-chat-route-tone={routeTone}
    >
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10 flex w-full items-center justify-center">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/14 text-current" data-chat-fab-icon-shell="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      </div>
    </button>
  );
}