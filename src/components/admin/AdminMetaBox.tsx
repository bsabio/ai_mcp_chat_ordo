import type { ReactNode } from "react";

interface AdminMetaBoxProps {
  title: string;
  description?: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function AdminMetaBox({
  title,
  description,
  children,
  collapsible = false,
  defaultOpen = true,
}: AdminMetaBoxProps) {
  const content = (
    <div className="grid gap-(--space-3)">
      <div className="grid gap-(--space-1)">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? <p className="text-xs leading-5 text-foreground/50">{description}</p> : null}
      </div>
      <div>{children}</div>
    </div>
  );

  if (!collapsible) {
    return (
      <section className="rounded-2xl border border-foreground/10 bg-background p-(--space-inset-panel)">
        {content}
      </section>
    );
  }

  return (
    <details className="rounded-2xl border border-foreground/10 bg-background p-(--space-inset-panel)" open={defaultOpen}>
      <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">{title}</summary>
      {description ? <p className="mt-(--space-2) text-xs leading-5 text-foreground/50">{description}</p> : null}
      <div className="mt-(--space-3)">{children}</div>
    </details>
  );
}