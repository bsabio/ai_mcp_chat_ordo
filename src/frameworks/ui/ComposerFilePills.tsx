"use client";

import React, { useEffect, useState } from "react";

interface ComposerFilePillsProps {
  files: File[];
  onRemove: (index: number) => void;
}

function FilePill({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [previewUrl] = useState<string | null>(() =>
    file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const icon =
    file.type === "application/pdf" ? "📄" :
    file.type === "text/plain" ? "📝" :
    null;

  return (
    <div
      className="ui-chat-file-pill flex items-center gap-(--space-2) rounded-full px-(--space-3) py-(--space-2) text-[11px] font-medium"
      title={file.name}
    >
      {previewUrl ? (
        <img src={previewUrl} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
      ) : icon ? (
        <span className="shrink-0 text-sm" aria-hidden="true">{icon}</span>
      ) : null}
      <span className="max-w-30 truncate">{file.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="focus-ring rounded-full p-(--space-1) text-foreground/56 transition-colors hover:text-red-500"
        aria-label={`Remove ${file.name}`}
      >
        ✕
      </button>
    </div>
  );
}

export function ComposerFilePills({ files, onRemove }: ComposerFilePillsProps) {
  if (files.length === 0) return null;

  return (
    <div
      className="mb-(--space-3) flex flex-wrap gap-(--space-2)"
      data-chat-file-pills="true"
    >
      {files.map((file, i) => (
        <FilePill key={i} file={file} onRemove={() => onRemove(i)} />
      ))}
    </div>
  );
}
