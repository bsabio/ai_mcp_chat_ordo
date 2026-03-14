import React, { useMemo } from "react";
import { CodeBlock } from "./CodeBlock";
import type {
  RichContent,
  BlockNode,
  InlineNode,
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
      <div className="h-[160px] w-full flex items-center justify-center text-xs opacity-50 animate-pulse bg-[var(--surface-muted)] rounded-xl border-theme my-2">
        Loading Diagram Engine...
      </div>
    ),
  },
);

const AudioPlayer = dynamic(
  () => import("../../components/AudioPlayer").then((mod) => mod.AudioPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="h-[72px] w-full max-w-sm flex items-center justify-center text-xs opacity-50 animate-pulse bg-[var(--surface-muted)] rounded-xl border-theme my-2">
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
      <div className="h-[72px] w-full max-w-2xl flex items-center justify-center text-xs opacity-50 animate-pulse bg-[var(--surface-muted)] rounded-xl border-theme my-2">
        Loading Web Search...
      </div>
    ),
  },
);

interface Props {
  content: RichContent;
  onLinkClick?: (slug: string) => void;
}

export const RichContentRenderer: React.FC<Props> = ({
  content,
  onLinkClick,
}) => {
  return (
    <div className="flex flex-col gap-3">
      {content.blocks.map((block, i) => {
        // Use stable keys for stateful blocks so React doesn't remount them
        // when preceding blocks shift indices during streaming.
        let key: string | number = i;
        if (block.type === "audio")
          key = `audio-${block.title}-${block.text.substring(0, 50)}`;
        else if (block.type === "code-block" && block.language === "mermaid")
          key = `mermaid-${block.code.substring(0, 50)}`;
        else if (block.type === "web-search")
          key = `websearch-${block.query.substring(0, 60)}`;
        return <BlockRenderer key={key} block={block} onLinkClick={onLinkClick} />;
      })}
    </div>
  );
};

type BlockProps<T extends BlockNode> = { block: T; onLinkClick?: (slug: string) => void };

const blockRegistry: { [K in BlockNode["type"]]: React.FC<BlockProps<Extract<BlockNode, { type: K }>>> } = {
  paragraph: ({ block, onLinkClick }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">
      <InlineRenderer nodes={block.content} onLinkClick={onLinkClick} />
    </p>
  ),
  heading: ({ block, onLinkClick }) => {
    const Tag = `h${block.level + 1}` as "h1" | "h2" | "h3" | "h4";
    const sizeClass =
      block.level === 1
        ? "text-lg"
        : block.level === 2
          ? "text-base"
          : "text-sm";
    return (
      <Tag className={`${sizeClass} font-bold mt-4 mb-2`}>
        <InlineRenderer nodes={block.content} onLinkClick={onLinkClick} />
      </Tag>
    );
  },
  blockquote: ({ block, onLinkClick }) => (
    <blockquote className="my-3 pl-4 border-l-4 border-[var(--border-color)] opacity-75 italic text-sm leading-relaxed">
      <InlineRenderer nodes={block.content} onLinkClick={onLinkClick} />
    </blockquote>
  ),
  list: ({ block, onLinkClick }) => (
    <ul className="mb-4 ml-6 space-y-2 list-disc marker:text-[var(--accent-color)]">
      {block.items.map((item, i) => (
        <li key={i} className="leading-relaxed pl-1">
          <InlineRenderer nodes={item} onLinkClick={onLinkClick} />
        </li>
      ))}
    </ul>
  ),
  divider: () => <hr className="my-4 border-[var(--border-color)]" />,
  "code-block": ({ block }) => {
    if (block.language === "mermaid") {
      return <MermaidRenderer code={block.code} />;
    }
    return <CodeBlock code={block.code} lang={block.language} />;
  },
  table: ({ block, onLinkClick }) => (
    <TableRenderer
      header={block.header}
      rows={block.rows}
      onLinkClick={onLinkClick}
    />
  ),
  audio: ({ block }) => (
    <div className="my-2 max-w-sm">
      <AudioPlayer text={block.text} title={block.title} />
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
}> = ({ block, onLinkClick }) => {
  const RendererComponent = blockRegistry[block.type] as React.FC<BlockProps<BlockNode>>;
  if (!RendererComponent) return null;
  return <RendererComponent block={block} onLinkClick={onLinkClick} />;
};

type InlineProps<T extends InlineNode> = { node: T; onLinkClick?: (slug: string) => void };

const inlineRegistry: { [K in InlineNode["type"]]: React.FC<InlineProps<Extract<InlineNode, { type: K }>>> } = {
  text: ({ node }) => <>{node.text}</>,
  bold: ({ node }) => <strong>{node.text}</strong>,
  "code-inline": ({ node }) => (
    <code className="bg-[var(--surface-muted)] text-[var(--foreground)] px-1.5 py-0.5 rounded-md text-[0.85em] font-mono border-theme">
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
};

const InlineRenderer: React.FC<{
  nodes: InlineNode[];
  onLinkClick?: (slug: string) => void;
}> = ({ nodes, onLinkClick }) => {
  return (
    <>
      {nodes.map((node, i) => {
        const RendererComponent = inlineRegistry[node.type] as React.FC<InlineProps<InlineNode>>;
        if (!RendererComponent) return null;
        return <RendererComponent key={i} node={node} onLinkClick={onLinkClick} />;
      })}
    </>
  );
};

const TableRenderer: React.FC<{
  header?: InlineNode[][];
  rows: InlineNode[][][];
  onLinkClick?: (slug: string) => void;
}> = ({ header, rows, onLinkClick }) => {
  return (
    <div className="my-4 w-full overflow-x-auto border-theme rounded-[var(--border-radius)]">
      <table className="w-full text-sm border-collapse">
        {header && (
          <thead>
            <tr className="accent-fill">
              {header.map((cell, i) => (
                <th
                  key={i}
                  className="px-5 py-3 text-left font-bold text-xs uppercase tracking-wider"
                >
                  <InlineRenderer nodes={cell} onLinkClick={onLinkClick} />
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
                  ? "bg-[var(--surface)] hover-surface transition-colors"
                  : "bg-[var(--surface-muted)] hover-surface transition-colors"
              }
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-5 py-3.5 align-top leading-relaxed border-b border-[var(--border-color)]"
                >
                  <InlineRenderer nodes={cell} onLinkClick={onLinkClick} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
