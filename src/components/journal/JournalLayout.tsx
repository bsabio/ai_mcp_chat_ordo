import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

interface JournalPageShellProps {
  children: ReactNode;
  narrow?: boolean;
}

interface JournalIntroCardProps {
  kicker: string;
  title: string;
  dek: string;
  meta?: Array<{ label: string; value: string }>;
}

interface JournalSectionHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

interface JournalFeatureCardProps {
  href: string;
  eyebrow: string;
  date?: string | null;
  title: string;
  description?: string | null;
  readingTime?: string | null;
  image?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  } | null;
}

interface JournalStoryCardProps {
  href: string;
  eyebrow: string;
  title: string;
  description?: string | null;
  meta?: string[];
  tone?: "essay" | "briefing";
}

interface JournalSectionEmptyStateProps {
  title: string;
  description: string;
  tone?: "essay" | "briefing";
}

interface JournalArchiveNavigationProps {
  groups: Array<{ year: string; href: string; count: number }>;
}

interface JournalArchiveCardProps {
  href: string;
  date?: string | null;
  title: string;
  description?: string | null;
  image?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  } | null;
  kicker?: string;
}

interface JournalArticleHeaderProps {
  kicker: string;
  title: string;
  dek?: string | null;
  meta: string[];
  tone?: "essay" | "briefing";
  sectionLabel?: string;
  readingTime?: string | null;
  identityLink?: {
    href: string;
    label: string;
  } | null;
}

interface JournalArticleFigureProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
  variant?: "hero" | "wide" | "inset" | "compact";
}

const JOURNAL_STORY_CARD_CLASS_NAMES: Record<NonNullable<JournalStoryCardProps["tone"]>, string> = {
  essay: "journal-story-essay editorial-paper-surface flex h-full flex-col gap-(--space-6) p-(--space-inset-panel) no-underline text-inherit transition duration-200",
  briefing: "journal-story-briefing grid gap-(--space-4) py-(--space-4) no-underline text-inherit transition duration-200 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start",
};

const JOURNAL_EMPTY_STATE_CLASS_NAMES: Record<NonNullable<JournalSectionEmptyStateProps["tone"]>, string> = {
  essay: "journal-empty-essay editorial-paper-surface p-(--space-inset-panel)",
  briefing: "journal-empty-briefing py-(--space-4)",
};

const JOURNAL_ARTICLE_HEADER_CLASS_NAMES: Record<NonNullable<JournalArticleHeaderProps["tone"]>, string> = {
  essay: "journal-article-header px-(--space-1) py-(--space-2)",
  briefing: "journal-article-header journal-article-header-briefing px-(--space-1) py-(--space-2)",
};

export function JournalPageShell({ children, narrow = false }: JournalPageShellProps) {
  return (
    <div className="shell-page editorial-page-shell">
      <div className={`mx-auto flex w-full flex-col gap-(--space-8) px-(--space-frame-default) py-(--space-8) ${narrow ? "max-w-5xl" : "max-w-7xl"}`}>
        {children}
      </div>
    </div>
  );
}

export function JournalIntroCard({ kicker, title, dek, meta = [] }: JournalIntroCardProps) {
  return (
    <header className="journal-intro-card px-(--space-1) py-(--space-2)" data-journal-surface="intro-card">
      <div className="grid gap-(--space-6) lg:grid-cols-[minmax(0,1.35fr)_minmax(14rem,18rem)] lg:gap-(--space-10)">
        <div className="space-y-(--space-4)">
          <p className="font-(--font-label) text-[0.68rem] uppercase tracking-[0.2em] text-foreground/52">{kicker}</p>
          <h1 className="max-w-[10ch] font-(--font-display) text-[clamp(2.8rem,6.6vw,5.4rem)] leading-[0.88] tracking-[-0.08em] text-balance">{title}</h1>
          <p className="max-w-152 text-[0.98rem] leading-7 text-foreground/70 sm:text-[1.02rem]">{dek}</p>
        </div>

        {meta.length > 0 ? (
          <dl className="grid gap-(--space-stack-default) border-t border-foreground/10 pt-(--space-stack-default) lg:border-l lg:border-t-0 lg:ps-(--space-6) lg:pt-(--space-0)" data-journal-surface="intro-meta-rail">
            {meta.map((item) => (
              <div key={item.label} className="grid gap-(--space-1)">
                <dt className="font-(--font-label) text-[0.64rem] uppercase tracking-[0.18em] text-foreground/60">{item.label}</dt>
                <dd className="text-[0.95rem] leading-6 text-foreground/78">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </header>
  );
}

export function JournalSectionHeader({ eyebrow, title, description }: JournalSectionHeaderProps) {
  return (
    <div className="journal-section-heading flex flex-col gap-(--space-cluster-default) pt-(--space-stack-default)" data-journal-surface="section-header">
      <div className="space-y-(--space-2)">
        <p className="font-(--font-label) text-[0.68rem] uppercase tracking-[0.18em] text-foreground/60">{eyebrow}</p>
        <h2 className="font-(--font-display) text-[clamp(1.7rem,3.2vw,2.8rem)] leading-[0.96] tracking-[-0.05em] text-balance">{title}</h2>
      </div>
      <p className="max-w-136 text-[0.95rem] leading-7 text-foreground/62">{description}</p>
    </div>
  );
}

export function JournalFeatureCard({ href, eyebrow, date, title, description, readingTime, image }: JournalFeatureCardProps) {
  const hasImage = image != null;

  return (
    <Link
      href={href}
      data-journal-role="lead-entry"
      data-journal-layout={hasImage ? "lead-split" : "lead-ledger"}
      className={`journal-feature-card grid gap-(--space-cluster-default) p-(--space-inset-panel) no-underline text-inherit transition duration-200 hover:border-foreground/22 ${hasImage ? "lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)] lg:items-start" : ""}`}
    >
      <div className="flex flex-col gap-(--space-stack-default)">
        <div className="flex flex-wrap gap-x-(--space-4) gap-y-(--space-2) border-b border-foreground/10 pb-(--space-stack-default) font-(--font-label) text-[0.68rem] uppercase tracking-[0.16em] text-foreground/60">
          <span>Latest entry</span>
          <span>{eyebrow}</span>
          {date ? <time>{date}</time> : null}
          {readingTime ? <span>{readingTime}</span> : null}
        </div>

        <div className="space-y-(--space-3)">
          <h2 className="max-w-[12ch] font-(--font-display) text-[clamp(2.2rem,4.8vw,3.9rem)] leading-[0.92] tracking-[-0.06em] text-balance">{title}</h2>
          {description ? <p className="max-w-136 text-[0.98rem] leading-7 text-foreground/70">{description}</p> : null}
        </div>
      </div>

      {image ? (
        <div className="journal-feature-media lg:min-h-56" data-journal-surface="feature-media">
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            className="block aspect-4/3 h-full w-full object-cover"
            sizes="(max-width: 1024px) 100vw, 34vw"
            priority
          />
        </div>
      ) : null}
    </Link>
  );
}

export function JournalStoryCard({ href, eyebrow, title, description, meta = [], tone = "essay" }: JournalStoryCardProps) {
  const isEssay = tone === "essay";
  const cardClassName = JOURNAL_STORY_CARD_CLASS_NAMES[tone];

  return (
    <Link
      href={href}
      data-journal-entry-tone={tone}
      data-journal-layout={isEssay ? "essay-ledger" : "briefing-ledger"}
      className={cardClassName}
    >
      {isEssay ? (
        <>
          <div className="flex flex-wrap gap-x-(--space-3) gap-y-(--space-2) border-b border-foreground/10 pb-(--space-4) font-(--font-label) text-[0.66rem] uppercase tracking-[0.16em] text-foreground/60">
            <span>{eyebrow}</span>
            {meta.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className="space-y-(--space-4)">
            <h3 className="max-w-[13ch] font-(--font-display) text-[clamp(2rem,2.6vw,2.8rem)] leading-[0.94] tracking-[-0.05em] text-balance">{title}</h3>
            {description ? <p className="max-w-136 text-[0.98rem] leading-8 text-foreground/68">{description}</p> : null}
          </div>
          <div className="mt-auto flex items-center justify-between gap-(--space-cluster-default) pt-(--space-2)">
            <span className="font-(--font-label) text-[0.66rem] uppercase tracking-[0.14em] text-foreground/68">Essay</span>
            <span className="font-(--font-label) text-[0.66rem] uppercase tracking-[0.14em] text-foreground/68">Open &rarr;</span>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-(--space-3) sm:grid-cols-[minmax(8rem,10rem)_minmax(0,1fr)] sm:gap-(--space-4)">
            <div className="flex flex-wrap gap-x-(--space-2) gap-y-(--space-1) font-(--font-label) text-[0.64rem] uppercase tracking-[0.16em] text-foreground/60 sm:flex-col sm:gap-y-(--space-2)">
              <span>{eyebrow}</span>
              {meta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <div className="space-y-(--space-2)">
              <h3 className="max-w-[22ch] font-(--font-display) text-[clamp(1.15rem,1.35vw,1.45rem)] leading-[1.06] tracking-[-0.03em] text-balance">{title}</h3>
              {description ? <p className="max-w-136 text-[0.92rem] leading-6 text-foreground/62">{description}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-(--space-cluster-default) border-t border-foreground/10 pt-(--space-stack-tight) sm:justify-end sm:border-t-0 sm:pt-(--space-0)">
            <span className="font-(--font-label) text-[0.64rem] uppercase tracking-[0.14em] text-foreground/64">Briefing</span>
            <span className="font-(--font-label) text-[0.64rem] uppercase tracking-[0.14em] text-foreground/64">Open &rarr;</span>
          </div>
        </>
      )}
    </Link>
  );
}

export function JournalSectionEmptyState({ title, description, tone = "essay" }: JournalSectionEmptyStateProps) {
  const isEssay = tone === "essay";
  const stateClassName = JOURNAL_EMPTY_STATE_CLASS_NAMES[tone];

  return (
    <div className={stateClassName} data-journal-surface={`empty-${tone}`}>
      <div className={`grid gap-(--space-3) ${isEssay ? "max-w-lg" : "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"}`}>
        <div className="space-y-(--space-2)">
          <p className="font-(--font-label) text-[0.64rem] uppercase tracking-[0.16em] text-foreground/60">{isEssay ? "Essay" : "Briefing"}</p>
          <h3 className={`font-(--font-display) tracking-[-0.04em] text-balance ${isEssay ? "text-[1.6rem] leading-[0.98]" : "text-[1.05rem] leading-[1.1]"}`}>{title}</h3>
          <p className={`text-foreground/62 ${isEssay ? "text-[0.95rem] leading-7" : "text-[0.9rem] leading-6"}`}>{description}</p>
        </div>
        {!isEssay ? <span className="font-(--font-label) text-[0.64rem] uppercase tracking-[0.14em] text-foreground/60">Empty</span> : null}
      </div>
    </div>
  );
}

export function JournalArchiveNavigation({ groups }: JournalArchiveNavigationProps) {
  return (
    <nav data-journal-role="archive-navigation" className="journal-archive-navigation flex flex-col gap-(--space-stack-default) pt-(--space-stack-default)" aria-label="Journal archive navigation">
      <div className="space-y-(--space-2)">
        <p className="font-(--font-label) text-[0.66rem] uppercase tracking-[0.16em] text-foreground/60">Archive</p>
        <h3 className="font-(--font-display) text-[1.5rem] leading-[0.98] tracking-[-0.04em]">Browse by year</h3>
        <p className="text-sm leading-6 text-foreground/62">Chronology first.</p>
      </div>
      <div className="flex flex-wrap gap-x-(--space-4) gap-y-(--space-2)">
        {groups.map((group) => (
          <a
            key={group.year}
            href={group.href}
            className="inline-flex items-center gap-(--space-2) border-b border-transparent pb-(--space-1) text-sm text-foreground/76 transition hover:border-foreground/30 hover:text-foreground"
          >
            <span>{group.year}</span>
            <span className="font-(--font-label) text-[0.64rem] uppercase tracking-[0.14em] text-foreground/60">{group.count}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}

export function JournalArchiveCard({ href, date, title, description, image: _image, kicker }: JournalArchiveCardProps) {
  return (
    <Link
      href={href}
      data-journal-entry-tone="archive"
      data-journal-layout="archive-row"
      className="journal-archive-row grid gap-(--space-3) py-(--space-4) no-underline text-inherit transition duration-200 hover:translate-x-0.5 hover:text-foreground sm:grid-cols-[minmax(10rem,12rem)_minmax(0,1fr)_auto] sm:items-start sm:gap-(--space-4)"
    >
      <div className="flex flex-wrap gap-x-(--space-3) gap-y-(--space-1) font-(--font-label) text-[0.64rem] uppercase tracking-[0.15em] text-foreground/60 sm:flex-col sm:gap-y-(--space-2)">
        {date ? <time>{date}</time> : <span>Archive</span>}
        {kicker ? <span>{kicker}</span> : null}
      </div>
      <div className="space-y-(--space-2)">
        <h3 className="max-w-[24ch] font-(--font-display) text-[clamp(1.2rem,1.6vw,1.6rem)] leading-[1.04] tracking-[-0.03em] text-balance">{title}</h3>
        {description ? <p className="max-w-184 text-[0.94rem] leading-6 text-foreground/64">{description}</p> : null}
      </div>
      <span className="font-(--font-label) text-[0.64rem] uppercase tracking-[0.14em] text-foreground/64 sm:pt-(--space-1)">Open &rarr;</span>
    </Link>
  );
}

export function JournalArticleHeader({
  kicker,
  title,
  dek,
  meta,
  tone = "essay",
  sectionLabel,
  readingTime,
  identityLink,
}: JournalArticleHeaderProps) {
  const isEssay = tone === "essay";
  const articleHeaderClassName = JOURNAL_ARTICLE_HEADER_CLASS_NAMES[tone];

  return (
    <header
      data-journal-role="article-header"
      data-journal-article-tone={tone}
      className={articleHeaderClassName}
    >
      <div className={`flex flex-col ${isEssay ? "gap-(--space-stack-default)" : "gap-(--space-stack-tight)"}`}>
        <div className="flex flex-wrap gap-x-(--space-4) gap-y-(--space-2) border-b border-foreground/10 pb-(--space-3) font-(--font-label) text-[0.68rem] uppercase tracking-[0.16em] text-foreground/60">
          <span>{kicker}</span>
          {sectionLabel ? <span>{sectionLabel}</span> : null}
          {readingTime ? <span>{readingTime}</span> : null}
        </div>

        <div className={isEssay ? "space-y-(--space-4)" : "grid gap-(--space-4) lg:grid-cols-[minmax(0,1.15fr)_minmax(15rem,0.85fr)] lg:items-start"}>
          <div className="space-y-(--space-4)">
            <h1 className={`font-(--font-display) leading-[0.9] tracking-[-0.07em] text-balance ${isEssay ? "max-w-[13ch] text-[clamp(2.9rem,5.8vw,5.1rem)]" : "max-w-[15ch] text-[clamp(2.2rem,4.1vw,3.5rem)]"}`}>{title}</h1>
            {dek ? <p className={`text-foreground/72 ${isEssay ? "max-w-2xl text-[1.04rem] leading-8 sm:text-[1.08rem]" : "max-w-136 text-[0.98rem] leading-7"}`}>{dek}</p> : null}
          </div>

          {!isEssay ? (
            <div className="space-y-(--space-3) border-t border-foreground/10 pt-(--space-3) lg:border-l lg:border-t-0 lg:pl-(--space-6) lg:pt-(--space-0)">
              {meta.length > 0 ? (
                <div className="flex flex-col gap-(--space-2) text-[0.92rem] leading-6 text-foreground/70">
                  {meta.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              ) : null}
              {identityLink ? (
                <a
                  href={identityLink.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-(--space-2) font-(--font-label) text-[0.68rem] uppercase tracking-[0.14em] text-foreground/62 underline decoration-foreground/18 underline-offset-4 transition hover:decoration-foreground/48 hover:text-foreground"
                >
                  <span>{identityLink.label}</span>
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        {(isEssay ? meta.length > 0 || identityLink : false) ? (
          <div
            data-journal-role="article-identity-rail"
            className="journal-article-identity-rail grid gap-(--space-3) pt-(--space-4) sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
          >
            {meta.length > 0 ? (
              <div className="flex flex-wrap gap-x-(--space-4) gap-y-(--space-2) text-[0.92rem] leading-6 text-foreground/70">
                {meta.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            ) : <div />}
            {identityLink ? (
              <a
                href={identityLink.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-(--space-2) font-(--font-label) text-[0.68rem] uppercase tracking-[0.14em] text-foreground/62 underline decoration-foreground/18 underline-offset-4 transition hover:decoration-foreground/48 hover:text-foreground sm:justify-self-end"
              >
                <span>{identityLink.label}</span>
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function JournalStandfirst({ children }: { children: ReactNode }) {
  return (
    <p data-journal-role="article-standfirst" className="journal-standfirst mx-auto max-w-2xl pt-(--space-4) text-[clamp(1.18rem,2vw,1.52rem)] leading-9 tracking-[-0.012em] text-foreground/78 sm:text-[1.32rem] sm:leading-10">
      {children}
    </p>
  );
}

export function JournalPullQuote({ children }: { children: ReactNode }) {
  return (
    <aside data-journal-role="pullquote" className="journal-pullquote my-(--space-10) p-(--space-inset-panel)">
      <blockquote className="max-w-[24ch] font-(--font-display) text-[clamp(1.55rem,2.6vw,2.3rem)] leading-[1.06] tracking-[-0.04em] text-balance text-foreground/88">
        {children}
      </blockquote>
    </aside>
  );
}

export function JournalSideNote({ children }: { children: ReactNode }) {
  return (
    <aside data-journal-role="sidenote" className="journal-sidenote my-(--space-8) px-(--space-0) py-(--space-4) text-sm leading-7 text-foreground/68 sm:float-right sm:ml-(--space-8) sm:w-[18rem] sm:pl-(--space-6)">
      <div className="mb-(--space-2) font-(--font-label) text-[0.68rem] uppercase tracking-[0.15em] text-foreground/60">Side note</div>
      <div>{children}</div>
    </aside>
  );
}

export function JournalArticleFigure({ src, alt, width, height, caption, variant = "wide" }: JournalArticleFigureProps) {
  const variantClassName = variant === "hero"
    ? "overflow-hidden"
    : variant === "compact"
      ? "mx-auto max-w-[32rem]"
      : variant === "inset"
        ? "mx-auto max-w-[40rem]"
        : "-mx-(--space-1) sm:-mx-(--space-2)";
  const imageRatioClassName = variant === "hero" ? "aspect-[16/10]" : variant === "compact" ? "aspect-[4/5]" : "aspect-[16/10]";

  return (
    <figure className={`editorial-paper-surface overflow-hidden ${variantClassName}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`block w-full ${imageRatioClassName} object-cover`}
        sizes="(max-width: 1024px) 100vw, 72rem"
        priority={variant === "hero" ? true : undefined}
      />
      {(caption || alt) ? (
        <figcaption className="border-t border-foreground/8 px-(--space-inset-default) py-(--space-inset-compact) font-(--font-label) text-[0.7rem] uppercase tracking-[0.12em] text-foreground/60 sm:px-(--space-6)">
          {caption || alt}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function JournalHeroFigure(props: Omit<JournalArticleFigureProps, "variant">) {
  return <JournalArticleFigure {...props} variant="hero" />;
}

export function JournalArticleBody({ children }: { children: ReactNode }) {
  return (
    <article data-journal-role="article-body" className="editorial-paper-surface p-(--space-inset-panel) sm:p-(--space-10) lg:p-(--space-12)">
      {children}
    </article>
  );
}