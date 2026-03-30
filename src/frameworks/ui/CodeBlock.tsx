"use client";

import React, { useState } from "react";
import { UI_CONSTANTS } from "@/lib/constants";

export function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  function copyCode() {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), UI_CONSTANTS.COPY_TIMEOUT_MS);
  }
  return (
    <div className="my-(--space-4) rounded-theme overflow-hidden border-theme text-sm">
      <div className="flex items-center justify-between code-chrome px-(--space-4) py-(--space-2)">
        <span className="text-label font-mono opacity-70">
          {lang || "code"}
        </span>
        <button
          onClick={copyCode}
          className="text-[10px] opacity-60 hover:opacity-100 transition-colors flex items-center gap-(--space-1)"
        >
          {copied ? (
            <>
              <span>✓</span> Copied
            </>
          ) : (
            <>
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>{" "}
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="code-chrome px-(--space-4) py-(--space-4) overflow-x-auto font-mono text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
