import Link from "next/link";

interface PublicStatusPageProps {
  brandName: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: {
    href: string;
    label: string;
  };
  secondaryAction?: {
    href: string;
    label: string;
  };
}

export function PublicStatusPage({
  brandName,
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
}: PublicStatusPageProps) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-4xl items-center px-(--space-frame-default) py-(--space-section-loose)">
      <section
        className="profile-panel-surface grid w-full gap-(--space-6) p-(--space-inset-panel)"
        data-public-status-page="true"
      >
        <div className="grid gap-(--space-3)">
          <p className="theme-label tier-micro uppercase text-foreground/42">{eyebrow}</p>
          <h1 className="theme-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-foreground/62 sm:text-base">
            {description}
          </p>
        </div>

        <div className="flex flex-wrap gap-(--space-3)">
          <Link href={primaryAction.href} className="btn-primary">
            {primaryAction.label}
          </Link>
          {secondaryAction ? (
            <Link
              href={secondaryAction.href}
              className="profile-inline-action focus-ring inline-flex min-h-11 items-center justify-center rounded-full px-(--space-inset-default) py-(--space-inset-tight) text-sm font-semibold transition-colors"
            >
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>

        <p className="text-xs uppercase tracking-[0.14em] text-foreground/38">
          {brandName}
        </p>
      </section>
    </main>
  );
}
