import { createRoot } from "react-dom/client";

import { GraphRenderer } from "@/components/GraphRenderer";
import type { ResolvedGraphPayload } from "@/core/use-cases/tools/graph-payload";

function waitForFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function rasterizeSvgToPngBlob(svgElement: SVGSVGElement): Promise<Blob> {
  const rect = svgElement.getBoundingClientRect();
  const width = Math.max(Math.ceil(rect.width), 1200);
  const height = Math.max(Math.ceil(rect.height), 700);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  let svgData = new XMLSerializer().serializeToString(svgElement);
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
    image.onerror = () => reject(new Error("Unable to load serialized graph SVG."));
    image.src = dataUrl;
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) {
    throw new Error("PNG conversion failed.");
  }

  return blob;
}

export async function renderGraphToPngBlob(payload: ResolvedGraphPayload): Promise<Blob> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "1200px";
  container.style.background = "#ffffff";
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    root.render(
      <GraphRenderer
        graph={payload.graph}
        title={payload.title}
        caption={payload.caption}
        summary={payload.summary}
        downloadFileName={payload.downloadFileName}
        dataPreview={payload.dataPreview}
      />,
    );

    await waitForFrame();
    await waitForFrame();

    const svgElement = container.querySelector("svg[data-testid='graph-svg']");
    if (!(svgElement instanceof SVGSVGElement)) {
      throw new Error("Graph rendering completed without an SVG output.");
    }

    return await rasterizeSvgToPngBlob(svgElement);
  } finally {
    root.unmount();
    container.remove();
  }
}