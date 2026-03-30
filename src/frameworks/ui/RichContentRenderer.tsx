import React from "react";
import { CodeBlock } from "./CodeBlock";
import type {
  RichContent,
  BlockNode,
  InlineNode,
  ActionLinkType,
} from "../../core/entities/rich-content";
import dynamic from "next/dynamic";

const MermaidRenderer = dynamic(
  () =>
    import("../../components/MermaidRenderer").then(
      (mod) => mod.MermaidRenderer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 w-full flex items-center justify-center text-xs opacity-50 animate-pulse bg-surface-muted rounded-theme border-theme my-(--space-2)">
        Loading Diagram Engine...
      </div>
    ),
  },
);

const GraphRenderer = dynamic(
  () => import("../../components/GraphRenderer").then((mod) => mod.GraphRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 w-full flex items-center justify-center text-xs opacity-50 animate-pulse bg-surface-muted rounded-theme border-theme my-(--space-2)">
        Loading Graph Engine...
      </div>
    ),
  },
);

const AudioPlayer = dynamic(
  () => import("../../components/AudioPlayer").then((mod) => mod.AudioPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="h-18 w-full max-w-sm flex items-center justify-center text-xs opacity-50 animate-pulse bg-surface-muted rounded-theme border-theme my-(--space-2)">
        Loading Audio Engine...
      </div>
    ),
  },
);

const WebSearchResultCard = dynamic(
  () =>
    import("../../components/WebSearchResultCard").then(
      (mod) => mod.WebSearchResultCard,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-18 w-full max-w-2xl flex items-center justify-center text-xs opacity-50 animate-pulse bg-surface-muted rounded-theme border-theme my-(--space-2)">
        Loading Web Search...
      </div>
    ),
  },
);

interface Props {
  content: RichContent;
  onLinkClick?: (slug: string) => void;
  onActionClick?: (actionType: ActionLinkType, value: string, params?: Record<string, string>) => void;
}

export const RichContentRenderer: React.FC<Props> = ({
  content,
  onLinkClick,
  onActionClick,
}) => {
  return (
    <div className="flex flex-col gap-(--space-stack-default)">
      {content.blocks.map((block, i) => {
        // Use stable keys for stateful blocks so React doesn't remount them
        // when preceding blocks shift indices during streaming.
        let key: string | number = i;
        if (block.type === "audio")
          key = `audio-${block.title}-${block.text.substring(0, 50)}`;
        else if (block.type === "code-block" && block.language === "mermaid")
          key = `mermaid-${block.code.substring(0, 50)}`;
        else if (block.type === "graph")
          key = `graph-${block.graph.kind}-${block.title ?? block.caption ?? i}`;
        else if (block.type === "web-search")
          key = `websearch-${block.query.substring(0, 60)}`;
        return <BlockRenderer key={key} block={block} onLinkClick={onLinkClick} onActionClick={onActionClick} />;
      })}
    </div>
  );
};

type BlockProps<T extends BlockNode> = { block: T; onLinkClick?: (slug: string) => void; onActionClick?: (actionType: ActionLinkType, value: string, params?: Record<string, string>) => void };

const blockRegistry: { [K in BlockNode["type"]]: React.FC<BlockProps<Extract<BlockNode, { type: K }>>> } = {
  paragraph: ({ block, onLinkClick, onActionClick }) => (
    <p className="mb-(--space-stack-tight) last:mb-(--space-0) leading-[inherit]">
      <InlineRenderer nodes={block.content} onLinkClick={onLinkClick} onActionClick={onActionClick} />
    </p>
  ),
  heading: ({ block, onLinkClick, onActionClick }) => {
    const Tag = `h${block.level + 1}` as "h1" | "h2" | "h3" | "h4";
    const sizeClass =
      block.level === 1
        ? "theme-display tier-body text-[1.08em] tracking-[-0.03em]"
        : block.level === 2
          ? "theme-display tier-body text-[1em] tracking-[-0.025em]"
          : "theme-label tier-micro text-foreground/62";
    return (
      <Tag className={`${sizeClass} mt-(--space-stack-default) mb-(--space-stack-tight) font-medium`}>
        <InlineRenderer nodes={block.content} onLinkClick={onLinkClick} onActionClick={onActionClick} />
      </Tag>
    );
  },
  blockquote: ({ block, onLinkClick, onActionClick }) => (
    <blockquote className="my-(--space-stack-default) pl-(--space-inset-default) italic text-foreground/68 leading-[inherit]">
      <InlineRenderer nodes={block.content} onLinkClick={onLinkClick} onActionClick={onActionClick} />
    </blockquote>
  ),
  list: ({ block, onLinkClick, onActionClick }) => (
    <ul className="mb-(--space-stack-default) ml-(--space-6) space-y-(--space-2) list-disc marker:text-accent/58">
      {block.items.map((item, i) => (
        <li key={i} className="leading-relaxed pl-(--space-1)">
          <InlineRenderer nodes={item} onLinkClick={onLinkClick} onActionClick={onActionClick} />
        </li>
      ))}
    </ul>
  ),
  divider: () => <hr className="my-(--space-stack-default) border-border" />,
  "operator-brief": ({ block, onLinkClick, onActionClick }) => (
    <div className="grid gap-(--space-cluster-default) lg:grid-cols-3" data-operator-brief="true">
      {block.sections.map((section) => (
        <section
          key={section.label}
          className="rounded-[1.3rem] border border-border/70 bg-surface-muted/55 px-(--space-inset-default) py-(--space-inset-default) shadow-[0_14px_30px_-24px_color-mix(in_srgb,var(--shadow-base)_12%,transparent)]"
          aria-label={section.label}
        >
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-foreground/42">{section.label}</p>
          <div className="mt-(--space-2) text-sm leading-6 text-foreground">
            <InlineRenderer nodes={section.summary} onLinkClick={onLinkClick} onActionClick={onActionClick} />
          </div>
          {section.items && section.items.length > 0 ? (
            <ul className="mt-(--space-3) space-y-(--space-2) text-sm leading-6 text-foreground/72">
              {section.items.map((item, index) => (
                <li key={`${section.label}-${index}`} className="flex gap-(--space-2)">
                  <span aria-hidden="true" className="mt-(--space-2) h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/28" />
                  <span>
                    <InlineRenderer nodes={item} onLinkClick={onLinkClick} onActionClick={onActionClick} />
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  ),
  "job-status": ({ block, onActionClick }) => {
    const statusTone =
      block.status === "failed"
        ? "border-[color:color-mix(in_srgb,var(--danger,#b42318)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--danger,#b42318)_8%,var(--surface))]"
        : block.status === "succeeded"
          ? "border-[color:color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--accent)_7%,var(--surface))]"
          : "border-border/70 bg-surface-muted/55";

    return (
      <section className={`rounded-[1.2rem] border px-(--space-inset-default) py-(--space-inset-compact) shadow-[0_14px_30px_-24px_color-mix(in_srgb,var(--shadow-base)_12%,transparent)] ${statusTone}`} aria-label={`${block.label} status`}>
        <div className="flex items-start justify-between gap-(--space-cluster-default)">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-foreground/42">{block.label}</p>
            {block.title ? (
              <p className="mt-(--space-1) text-sm font-medium text-foreground">{block.title}</p>
            ) : null}
            {block.subtitle ? (
              <p className="mt-(--space-1) text-xs text-foreground/56">{block.subtitle}</p>
            ) : null}
            <p className="mt-(--space-1) text-sm font-medium text-foreground">{block.status.replace(/^[a-z]/, (char) => char.toUpperCase())}</p>
          </div>
          {block.progressPercent != null ? (
            <p className="text-xs font-medium tabular-nums text-foreground/48">{Math.round(block.progressPercent)}%</p>
          ) : null}
        </div>

        {block.progressPercent != null ? (
          <div className="mt-(--space-3) h-2 overflow-hidden rounded-full bg-background/80">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${Math.max(0, Math.min(100, block.progressPercent))}%` }}
            />
          </div>
        ) : null}

        {block.progressLabel ? (
          <p className="mt-(--space-3) text-sm text-foreground/72">{block.progressLabel}</p>
        ) : null}
        {block.summary ? (
          <p className="mt-(--space-3) text-sm text-foreground/72">{block.summary}</p>
        ) : null}
        {block.error ? (
          <p className="mt-(--space-3) text-sm text-foreground/72">{block.error}</p>
        ) : null}
        {block.actions && block.actions.length > 0 ? (
          <div className="mt-(--space-4) flex flex-wrap gap-(--space-2)">
            {block.actions.map((action, index) => (
              <InlineRenderer
                key={`${block.jobId}-action-${index}`}
                nodes={[action]}
                onActionClick={onActionClick}
              />
            ))}
          </div>
        ) : null}
      </section>
    );
  },
  "code-block": ({ block }) => {
    if (block.language === "mermaid") {
      return (
        <MermaidRenderer
          code={block.code}
          title={block.title}
          caption={block.caption}
          downloadFileName={block.downloadFileName}
        />
      );
    }
    return <CodeBlock code={block.code} lang={block.language} />;
  },
  graph: ({ block }) => (
    <GraphRenderer
      graph={block.graph}
      title={block.title}
      caption={block.caption}
      summary={block.summary}
      downloadFileName={block.downloadFileName}
      dataPreview={block.dataPreview}
    />
  ),
  table: ({ block, onLinkClick, onActionClick }) => (
    <TableRenderer
      header={block.header}
      rows={block.rows}
      onLinkClick={onLinkClick}
      onActionClick={onActionClick}
    />
  ),
  audio: ({ block }) => (
    <div className="my-(--space-2) max-w-sm">
      <AudioPlayer
        text={block.text}
        title={block.title}
        assetId={block.assetId}
      />
    </div>
  ),
  "web-search": ({ block }) => (
    <WebSearchResultCard
      query={block.query}
      allowed_domains={block.allowed_domains}
      model={block.model}
    />
  ),
};

const BlockRenderer: React.FC<{
  block: BlockNode;
  onLinkClick?: (slug: string) => void;
  onActionClick?: (actionType: ActionLinkType, value: string, params?: Record<string, string>) => void;
}> = ({ block, onLinkClick, onActionClick }) => {
  const RendererComponent = blockRegistry[block.type] as React.FC<BlockProps<BlockNode>>;
  if (!RendererComponent) return null;
  return <RendererComponent block={block} onLinkClick={onLinkClick} onActionClick={onActionClick} />;
};

type InlineProps<T extends InlineNode> = { node: T; onLinkClick?: (slug: string) => void; onActionClick?: (actionType: ActionLinkType, value: string, params?: Record<string, string>) => void };

const inlineRegistry: { [K in InlineNode["type"]]: React.FC<InlineProps<Extract<InlineNode, { type: K }>>> } = {
  text: ({ node }) => <>{node.text}</>,
  bold: ({ node }) => <strong>{node.text}</strong>,
  "code-inline": ({ node }) => (
    <code className="bg-surface-muted/72 text-foreground px-(--space-2) py-(--space-inset-tight) rounded-md text-[0.85em] font-mono">
      {node.text}
    </code>
  ),
  "library-link": ({ node, onLinkClick }) => (
    <button
      onClick={() => onLinkClick?.(node.slug)}
      className="link-accent"
    >
      {node.slug.replace(/-/g, " ")}
    </button>
  ),
  "action-link": ({ node, onActionClick }) => (
    <button
      onClick={() => onActionClick?.(node.actionType, node.value, node.params)}
      className="inline-flex items-center gap-(--space-1) font-semibold text-accent-interactive underline decoration-accent-interactive/30 underline-offset-2 transition-colors hover:text-accent-interactive/80 hover:decoration-accent-interactive/50 focus-ring rounded-sm"
      data-chat-action-link={node.actionType}
      aria-label={`${node.label} (${node.actionType})`}
    >
      {node.label}
    </button>
  ),
};

const InlineRenderer: React.FC<{
  nodes: InlineNode[];
  onLinkClick?: (slug: string) => void;
  onActionClick?: (actionType: ActionLinkType, value: string, params?: Record<string, string>) => void;
}> = ({ nodes, onLinkClick, onActionClick }) => {
  return (
    <>
      {nodes.map((node, i) => {
        const RendererComponent = inlineRegistry[node.type] as React.FC<InlineProps<InlineNode>>;
        if (!RendererComponent) return null;
        return <RendererComponent key={i} node={node} onLinkClick={onLinkClick} onActionClick={onActionClick} />;
      })}
    </>
  );
};

const TableRenderer: React.FC<{
  header?: InlineNode[][];
  rows: InlineNode[][][];
  onLinkClick?: (slug: string) => void;
  onActionClick?: (actionType: ActionLinkType, value: string, params?: Record<string, string>) => void;
}> = ({ header, rows, onLinkClick, onActionClick }) => {
  return (
    <div className="my-(--space-stack-default) w-full overflow-x-auto border-theme rounded-theme">
      <table className="w-full text-sm border-collapse">
        {header && (
          <thead>
            <tr className="accent-fill">
              {header.map((cell, i) => (
                <th
                  key={i}
                  className="px-(--space-inset-default) py-(--space-inset-compact) text-left font-bold text-xs uppercase tracking-wider"
                >
                  <InlineRenderer nodes={cell} onLinkClick={onLinkClick} onActionClick={onActionClick} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className={
                ri % 2 === 0
                  ? "bg-surface hover-surface transition-colors"
                  : "bg-surface-muted hover-surface transition-colors"
              }
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-(--space-inset-default) py-(--space-inset-compact) align-top leading-relaxed border-b border-border"
                >
                  <InlineRenderer nodes={cell} onLinkClick={onLinkClick} onActionClick={onActionClick} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
