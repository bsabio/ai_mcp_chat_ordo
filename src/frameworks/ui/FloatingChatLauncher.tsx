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
      onClick={onOpen}
      className="fixed bottom-6 inset-e-6 z-60 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full accent-interactive-fill shadow-[-20px_20px_60px_rgba(0,0,0,0.4)] transition-all duration-300 group active:scale-95 focus-ring hover:scale-110"
      style={{
        insetBlockEnd: "max(1.5rem, var(--safe-area-inset-bottom))",
        insetInlineEnd: "max(1.5rem, var(--safe-area-inset-right))",
      }}
      aria-label={`Open ${identity.name} chat`}
      data-chat-fab-launcher="true"
      data-chat-fab-state="idle"
      data-chat-route-tone={routeTone}
    >
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10 flex w-full items-center justify-center">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/14 text-current">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      </div>
    </button>
  );
}