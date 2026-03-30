"use client";

export default function AdminErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-stack-md, 1rem)",
        padding: "var(--space-inset-lg, 2rem)",
        textAlign: "center",
        minHeight: "40vh",
      }}
    >
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
        Something went wrong
      </h2>
      <p style={{ color: "var(--color-muted, #666)", maxWidth: "32rem" }}>
        {error.message || "An unexpected error occurred on this page."}
      </p>
      <div style={{ display: "flex", gap: "var(--space-cluster-sm, 0.5rem)" }}>
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            border: "1px solid var(--color-border, #ccc)",
            background: "var(--color-surface, #fff)",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <a
          href="/admin"
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            border: "1px solid var(--color-border, #ccc)",
            background: "var(--color-surface, #fff)",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
