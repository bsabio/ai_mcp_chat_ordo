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
    <main className="public-entry-shell" data-public-status-route="true">
      <section
        className="profile-panel-surface public-entry-card"
        data-public-status-page="true"
      >
        <div className="public-entry-header">
          <p className="public-entry-kicker">{eyebrow}</p>
          <h1 className="public-entry-title max-w-3xl" data-public-entry-title="true">
            {title}
          </h1>
          <p className="public-entry-description">
            {description}
          </p>
        </div>

        <div className="public-entry-actions">
          <Link
            href={primaryAction.href}
            className="btn-primary focus-ring inline-flex w-full items-center justify-center sm:w-auto"
            data-public-entry-primary-action="true"
          >
            {primaryAction.label}
          </Link>
          {secondaryAction ? (
            <Link
              href={secondaryAction.href}
              className="btn-secondary focus-ring w-full sm:w-auto"
            >
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>

        <p className="font-(--font-label) text-[0.64rem] uppercase tracking-[0.14em] text-foreground/40">
          {brandName}
        </p>
      </section>
    </main>
  );
}
