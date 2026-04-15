"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { ToolCard } from "./ToolCard";
import { PanZoomViewport } from "./PanZoomViewport";
import { downloadFileFromUrl } from "../lib/download-browser";

function getSvgViewportMetrics(svgContent: string): { width: number; height: number } {
  if (!svgContent.trim()) {
    return { width: 960, height: 640 };
  }

  try {
    const parser = new DOMParser();
    const document = parser.parseFromString(svgContent, "image/svg+xml");
    const svg = document.querySelector("svg");
    if (!svg) {
      return { width: 960, height: 640 };
    }

    const viewBox = svg.getAttribute("viewBox")?.trim().split(/\s+/).map(Number);
    if (viewBox && viewBox.length === 4 && viewBox.every((value) => Number.isFinite(value))) {
      return {
        width: Math.max(viewBox[2] ?? 960, 1),
        height: Math.max(viewBox[3] ?? 640, 1),
      };
    }

    const width = Number(svg.getAttribute("width")?.replace(/px$/, ""));
    const height = Number(svg.getAttribute("height")?.replace(/px$/, ""));
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
  } catch {
    // fall through to the default viewport
  }

  return { width: 960, height: 640 };
}

export function MermaidRenderer({
  code,
  title,
  caption,
  downloadFileName,
}: {
  code: string;
  title?: string;
  caption?: string;
  downloadFileName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const inferChartKind = (source: string): string => {
    const normalized = source.trim();
    if (normalized.startsWith("xychart-beta")) return "XY Chart";
    if (normalized.startsWith("quadrantChart")) return "Quadrant Chart";
    if (normalized.startsWith("mindmap")) return "Mindmap";
    if (normalized.startsWith("pie")) return "Pie Chart";
    if (normalized.startsWith("flowchart") || normalized.startsWith("graph")) return "Flowchart";
    return "Chart";
  };

  const toFileStem = (value: string): string =>
    value
      .trim()
      .replace(/\.[a-z0-9]+$/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "chart";

  const inferredKind = inferChartKind(code);
  const headerTitle = title?.trim() || caption?.trim() || inferredKind;
  const headerSubtitle = title?.trim() && caption?.trim()
    ? caption.trim()
    : `${inferredKind} · Mermaid`;
  const exportStem = toFileStem(downloadFileName || title || caption || inferredKind);
  const svgMetrics = React.useMemo(() => getSvgViewportMetrics(svgContent), [svgContent]);

  useEffect(() => {
    let isMounted = true;

    async function renderDiagram() {
      try {
        setError(null);

        // Resolve CSS custom properties to hex colors that Mermaid/d3-color can parse.
        // CSS vars using oklch() resolve to lab() in some browsers — unsupported by Mermaid.
        const resolveColor = (varName: string, fallback: string): string => {
          try {
            const el = document.createElement("div");
            el.style.display = "none";
            el.style.color = `var(${varName})`;
            document.body.appendChild(el);
            const computed = getComputedStyle(el).color;
            document.body.removeChild(el);

            const match = computed.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
              const [, r, g, b] = match;
              return `#${Number(r).toString(16).padStart(2, "0")}${Number(g).toString(16).padStart(2, "0")}${Number(b).toString(16).padStart(2, "0")}`;
            }
            return fallback;
          } catch {
            return fallback;
          }
        };

        const style = getComputedStyle(document.documentElement);
        const fontFamily = style.getPropertyValue("--font-base").trim() || "sans-serif";

        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            fontFamily,
            primaryColor: resolveColor("--surface-muted", "#f1f5f9"),
            primaryTextColor: resolveColor("--foreground", "#111111"),
            primaryBorderColor: resolveColor("--border-color", "#e2e8f0"),
            lineColor: resolveColor("--foreground", "#111111"),
            secondaryColor: resolveColor("--surface-muted", "#f1f5f9"),
            tertiaryColor: resolveColor("--surface-hover", "#f1f5f9"),
            mainBkg: "transparent",
            nodeBorder: resolveColor("--border-color", "#e2e8f0"),
            clusterBkg: "transparent",
            clusterBorder: resolveColor("--border-color", "#e2e8f0"),
            titleColor: resolveColor("--foreground", "#111111"),
            edgeLabelBackground: resolveColor("--surface", "#ffffff"),
          },
          flowchart: {
            htmlLabels: true,
            curve: "basis",
          },
        });

        // We need a unique ID for the SVG
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

        // Fix: The LLM often outputs literal '\n' characters inside string node labels.
        // Mermaid needs these to be HTML <br/> tags to render multi-line text when htmlLabels is true.
        const processedCode = code.replace(/\\n/g, "<br/>");

        const { svg } = await mermaid.render(id, processedCode);

        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
          // Mermaid sometimes throws but injects an error SVG anyway. We can clean it up.
          const errorSvg = document.getElementById(`d${err}`);
          if (errorSvg) errorSvg.remove();
        }
      }
    }

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [code]);

  const handleDownloadPng = () => {
    if (!svgContent || !containerRef.current) return;

    const svgElement = containerRef.current.querySelector("svg");
    if (!svgElement) return;

    try {
      // Create a canvas with the SVG dimensions
      const canvas = document.createElement("canvas");
      const bbox = svgElement.getBBox();
      const width = svgElement.viewBox.baseVal.width || bbox.width || 800;
      const height = svgElement.viewBox.baseVal.height || bbox.height || 600;

      // Use a scale factor for higher quality
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Serialize and ensure xmlns is present (critical for conversion)
      let svgData = new XMLSerializer().serializeToString(svgElement);
      if (!svgData.includes("http://www.w3.org/2000/svg")) {
        svgData = svgData.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      // Use Base64 data URL instead of Blob for better security compatibility in some browsers
      const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
      const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

      const img = new Image();
      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pngUrl = canvas.toDataURL("image/png");
          downloadFileFromUrl(pngUrl, `${exportStem}_${Date.now()}.png`);
        } catch (err) {
          console.error("PNG conversion failed, falling back to SVG", err);
          // Fallback to SVG download if canvas is tainted or toDataURL fails
          const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
          const svgUrl = URL.createObjectURL(svgBlob);
          downloadFileFromUrl(svgUrl, `${exportStem}_${Date.now()}.svg`);
          setTimeout(() => URL.revokeObjectURL(svgUrl), 100);
        }
      };
      img.onerror = () => {
        console.error("Image load failed for PNG conversion");
      };
      img.src = dataUrl;
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const status =
    !svgContent && !error ? "loading" : error ? "error" : "success";

  return (
    <ToolCard
      title={headerTitle}
      subtitle={headerSubtitle}
      status={status}
      expandable={!!svgContent}
      onDownload={svgContent ? handleDownloadPng : undefined}
      downloadTooltip="Download as PNG"
      icon={
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M8 9h8" />
          <path d="M8 15h8" />
          <circle cx="8" cy="12" r="1" />
          <circle cx="16" cy="12" r="1" />
        </svg>
      }
    >
      <div
        ref={containerRef}
        className="w-full p-(--space-4)"
      >
        {error ? (
          <div className="w-full rounded-lg border-[color-mix(in_oklab,var(--status-error)_20%,transparent)] bg-[color-mix(in_oklab,var(--status-error)_10%,transparent)] p-(--space-4) text-xs font-mono text-status-error">
            Failed to render chart: {error}
          </div>
        ) : svgContent ? (
          <PanZoomViewport
            ariaLabel={`${headerTitle} chart`}
            contentWidth={svgMetrics.width}
            contentHeight={svgMetrics.height}
            testId="mermaid-viewport"
          >
            <div
              className="h-full w-full [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </PanZoomViewport>
        ) : (
          <div className="h-32 flex items-center justify-center text-xs opacity-50 animate-pulse">
            Rendering node graph...
          </div>
        )}
      </div>
    </ToolCard>
  );
}
