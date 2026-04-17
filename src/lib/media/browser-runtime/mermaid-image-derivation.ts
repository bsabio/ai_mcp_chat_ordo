import mermaid from "mermaid";

let mermaidInitialized = false;

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
    return { width: 960, height: 640 };
  }

  return { width: 960, height: 640 };
}

function resolveColor(varName: string, fallback: string): string {
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
  } catch {
    return fallback;
  }

  return fallback;
}

function ensureMermaidInitialized(): void {
  if (mermaidInitialized) {
    return;
  }

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

  mermaidInitialized = true;
}

export async function rasterizeSvgMarkupToPngBlob(svgMarkup: string): Promise<Blob> {
  const metrics = getSvgViewportMetrics(svgMarkup);
  const width = Math.max(Math.ceil(metrics.width), 1200);
  const height = Math.max(Math.ceil(metrics.height), 700);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  let svgData = svgMarkup;
  if (!svgData.includes("http://www.w3.org/2000/svg")) {
    svgData = svgData.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const image = new Image();
  const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => {
      context.drawImage(image, 0, 0, width, height);
      resolve();
    };
    image.onerror = () => reject(new Error("Unable to load serialized SVG."));
    image.src = dataUrl;
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) {
    throw new Error("PNG conversion failed.");
  }

  return blob;
}

export async function renderMermaidChartToPngBlob(code: string): Promise<Blob> {
  ensureMermaidInitialized();

  const renderId = `mermaid-compose-${Math.random().toString(36).slice(2, 9)}`;
  const processedCode = code.replace(/\\n/g, "<br/>");
  const { svg } = await mermaid.render(renderId, processedCode);

  return rasterizeSvgMarkupToPngBlob(svg);
}