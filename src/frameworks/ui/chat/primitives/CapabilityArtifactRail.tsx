export interface CapabilityArtifactRailItem {
  id?: string;
  label: string;
  href?: string | null;
  meta?: string | null;
}

export interface CapabilityArtifactRailProps {
  title?: string;
  items: CapabilityArtifactRailItem[];
}

export function CapabilityArtifactRail({
  title = "Artifacts",
  items,
}: CapabilityArtifactRailProps) {
  const visibleItems = items.filter((item) => item.label.trim().length > 0);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <section data-capability-artifact-rail="true">
      <p className="ui-capability-card-section-label">{title}</p>
      <ul className="ui-capability-artifact-list" data-capability-artifact-list="true">
        {visibleItems.map((item) => (
          <li
            key={item.id ?? item.href ?? item.label}
            className="ui-capability-artifact-item"
            data-capability-artifact-item="true"
          >
            {item.href ? (
              <a
                className="ui-capability-artifact-link focus-ring"
                href={item.href}
                target={item.href.startsWith("/") ? undefined : "_blank"}
                rel={item.href.startsWith("/") ? undefined : "noreferrer"}
              >
                {item.label}
              </a>
            ) : (
              <span className="ui-capability-artifact-link">{item.label}</span>
            )}
            {item.meta ? <span className="ui-capability-artifact-meta">{item.meta}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
