"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ordo:migrated-conversations";
const DISPLAY_DURATION_MS = 6000;

export function MigrationToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let frameId: number | null = null;

    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(STORAGE_KEY);

      const count = Number(raw);
      if (count > 0) {
        const nextMessage = count === 1
          ? "Your conversation was saved to your account."
          : `${count} conversations were saved to your account.`;

        frameId = window.requestAnimationFrame(() => {
          setMessage(nextMessage);
        });
      }
    } catch {
      /* storage unavailable */
    }

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), DISPLAY_DURATION_MS);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="migration-toast"
    >
      <p className="migration-toast-text">{message}</p>
      <button
        type="button"
        onClick={() => setMessage(null)}
        className="migration-toast-dismiss"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
