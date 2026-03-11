import React, { useState } from "react";
import { UI_CONSTANTS } from "@/lib/constants";

function renderSpan(text: string, key: string | number): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const combined = /(\*\*[^*]+\*\*|`[^`]+`|\[\[[^\]]+\]\])/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = combined.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const match = m[0];
    if (match.startsWith("**")) {
      parts.push(<strong key={`b-${m.index}`}>{match.slice(2, -2)}</strong>);
    } else if (match.startsWith("`")) {
      parts.push(
        <code
          key={`c-${m.index}`}
          className="bg-[var(--surface-muted)] text-[var(--accent-color)] px-1.5 py-0.5 rounded-md text-xs font-mono border-theme font-bold"
        >
          {match.slice(1, -1)}
        </code>,
      );
    } else if (match.startsWith("[[")) {
      const slug = match.slice(2, -2);
      parts.push(
        <button
          key={`l-${m.index}`}
          onClick={() => (window as unknown as { openLibraryChapter?: (slug: string) => void }).openLibraryChapter?.(slug)}
          className="link-accent"
        >
          {slug.replace(/-/g, " ")}
        </button>,
      );
    }
    last = m.index + match.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  if (parts.length === 0) return null;
  return <span key={key}>{parts}</span>;
}

function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .map((cell) => cell.trim())
    .filter(
      (_, i, arr) =>
        !(i === 0 && _ === "") && !(i === arr.length - 1 && _ === ""),
    );
}

function isTableSeparator(line: string): boolean {
  if (!line || typeof line !== "string") return false;
  return (
    /^\|[\s|\-:]+\|$/.test(line.trim()) ||
    /^[\-:]+(\|[\-:\s]*)+$/.test(line.trim())
  );
}

function MarkdownList({ items }: { items: string[] }) {
  return (
    <ul className="mb-3 ml-4 space-y-1 list-disc">
      {items.map((item, i) => (
        <li key={i} className="leading-relaxed">
          {renderSpan(item, `li-${i}`)}
        </li>
      ))}
    </ul>
  );
}

function MarkdownTable({ headerCells, rows }: { headerCells: string[] | null; rows: string[][] }) {
  return (
    <div
      className="my-4 w-full overflow-x-auto"
      style={{
        borderRadius: "var(--border-radius)",
        border: "var(--border-width) solid var(--border-color)",
      }}
    >
      <table className="w-full text-sm border-collapse">
        {headerCells && (
          <thead>
            <tr
              style={{
                backgroundColor: "var(--accent-color)",
                color: "var(--accent-foreground)",
              }}
            >
              {headerCells.map((cell, ci) => (
                <th
                  key={ci}
                  className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider whitespace-nowrap"
                >
                  {renderSpan(cell, `th-${ci}`)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              style={{
                backgroundColor:
                  ri % 2 === 0 ? "var(--surface)" : "var(--surface-muted)",
              }}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-4 py-2.5 align-top leading-relaxed"
                  style={{ borderBottom: `1px solid var(--border-color)` }}
                >
                  {renderSpan(cell, `td-${ri}-${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  function copyCode() {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), UI_CONSTANTS.COPY_TIMEOUT_MS);
  }
  return (
    <div className="my-4 rounded-xl overflow-hidden border-theme text-sm">
      <div className="flex items-center justify-between code-chrome px-4 py-2">
        <span className="text-label font-mono opacity-70">
          {lang || "code"}
        </span>
        <button
          onClick={copyCode}
          className="text-[10px] opacity-60 hover:opacity-100 transition-colors flex items-center gap-1"
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
      <pre className="code-chrome px-4 py-4 overflow-x-auto font-mono text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function renderMarkdown(content: string): React.ReactNode {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let paragraphBuffer: string[] = [];
  let tableBuffer: string[][] = [];
  let tableHasHeader = false;
  let codeBuffer: string[] = [];
  let codeLang = "";
  let inCode = false;

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const text = paragraphBuffer.join(" ");
    elements.push(
      <p key={`p-${elements.length}`} className="mb-3 leading-relaxed">
        {renderSpan(text, `ps-${elements.length}`)}
      </p>,
    );
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) return;
    elements.push(
      <span key={`ul-wrapper-${elements.length}`}>
        <MarkdownList items={listBuffer} />
      </span>
    );
    listBuffer = [];
  };

  const flushTable = () => {
    if (tableBuffer.length === 0) return;

    const rows = tableHasHeader ? tableBuffer.slice(1) : tableBuffer;
    const headerCells = tableHasHeader ? tableBuffer[0] : null;

    elements.push(
      <span key={`tbl-wrapper-${elements.length}`}>
        <MarkdownTable headerCells={headerCells} rows={rows} />
      </span>
    );
    tableBuffer = [];
    tableHasHeader = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (!inCode) {
        flushParagraph();
        flushList();
        flushTable();
        codeLang = trimmed.slice(3).trim();
        inCode = true;
        codeBuffer = [];
      } else {
        elements.push(
          <CodeBlock
            key={`code-${elements.length}`}
            code={codeBuffer.join("\n")}
            lang={codeLang}
          />,
        );
        codeBuffer = [];
        codeLang = "";
        inCode = false;
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    if (
      trimmed.startsWith("|") ||
      (tableBuffer.length > 0 && trimmed.startsWith("|"))
    ) {
      if (isTableSeparator(trimmed)) {
        tableHasHeader = true;
        continue;
      }
      flushParagraph();
      flushList();
      tableBuffer.push(parseTableRow(trimmed));
      continue;
    } else if (tableBuffer.length > 0) {
      flushTable();
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      elements.push(
        <h4
          key={`h4-${elements.length}`}
          className="text-sm font-bold mt-4 mb-2"
        >
          {renderSpan(trimmed.slice(4), `h4s-${elements.length}`)}
        </h4>,
      );
    } else if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      elements.push(
        <h3
          key={`h3-${elements.length}`}
          className="text-base font-bold mt-4 mb-2"
        >
          {renderSpan(trimmed.slice(3), `h3s-${elements.length}`)}
        </h3>,
      );
    } else if (trimmed.startsWith("# ")) {
      flushParagraph();
      flushList();
      elements.push(
        <h2
          key={`h2-${elements.length}`}
          className="text-lg font-bold mt-4 mb-2"
        >
          {renderSpan(trimmed.slice(2), `h2s-${elements.length}`)}
        </h2>,
      );
    } else if (trimmed.startsWith("> ")) {
      flushParagraph();
      flushList();
      elements.push(
        <blockquote
          key={`bq-${elements.length}`}
          className="my-3 pl-4 border-l-4 border-[var(--border-color)] opacity-75 italic text-sm leading-relaxed"
        >
          {renderSpan(trimmed.slice(2), `bqs-${elements.length}`)}
        </blockquote>,
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushParagraph();
      listBuffer.push(trimmed.slice(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      flushParagraph();
      listBuffer.push(trimmed.replace(/^\d+\.\s/, ""));
    } else if (trimmed === "---" || trimmed === "***") {
      flushParagraph();
      flushList();
      elements.push(
        <hr
          key={`hr-${elements.length}`}
          className="my-4 border-[var(--border-color)]"
        />,
      );
    } else if (!trimmed) {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraphBuffer.push(trimmed);
    }
  }

  flushParagraph();
  flushList();
  flushTable();

  return <>{elements}</>;
}
