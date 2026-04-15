"use client";

import React from "react";

type ViewportSize = {
  width: number;
  height: number;
};

type TransformState = {
  scale: number;
  x: number;
  y: number;
};

type PointerPoint = {
  x: number;
  y: number;
};

type PanGesture = {
  type: "pan";
  origin: TransformState;
  startPointer: PointerPoint;
};

type PinchGesture = {
  type: "pinch";
  startTransform: TransformState;
  startDistance: number;
  focalContentPoint: PointerPoint;
};

type GestureState = PanGesture | PinchGesture;

const MIN_SCALE = 0.45;
const MAX_SCALE = 6;
const VIEWPORT_PADDING = 40;
const PAN_PADDING = 80;

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function clampOffset(
  offset: number,
  viewportSize: number,
  scaledContentSize: number,
) {
  if (scaledContentSize + PAN_PADDING * 2 <= viewportSize) {
    return (viewportSize - scaledContentSize) / 2;
  }

  const min = viewportSize - scaledContentSize - PAN_PADDING;
  const max = PAN_PADDING;
  return Math.min(max, Math.max(min, offset));
}

function clampTransform(
  transform: TransformState,
  viewport: ViewportSize,
  contentWidth: number,
  contentHeight: number,
): TransformState {
  const scale = clampScale(transform.scale);
  const scaledWidth = contentWidth * scale;
  const scaledHeight = contentHeight * scale;

  return {
    scale,
    x: clampOffset(transform.x, viewport.width, scaledWidth),
    y: clampOffset(transform.y, viewport.height, scaledHeight),
  };
}

function getDistance(first: PointerPoint, second: PointerPoint) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function getMidpoint(first: PointerPoint, second: PointerPoint): PointerPoint {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function buildFitTransform(
  viewport: ViewportSize,
  contentWidth: number,
  contentHeight: number,
): TransformState {
  const availableWidth = Math.max(viewport.width - VIEWPORT_PADDING * 2, 32);
  const availableHeight = Math.max(viewport.height - VIEWPORT_PADDING * 2, 32);
  const scale = clampScale(
    Math.min(availableWidth / contentWidth, availableHeight / contentHeight),
  );

  return clampTransform(
    {
      scale,
      x: (viewport.width - contentWidth * scale) / 2,
      y: (viewport.height - contentHeight * scale) / 2,
    },
    viewport,
    contentWidth,
    contentHeight,
  );
}

function buildActualSizeTransform(
  viewport: ViewportSize,
  contentWidth: number,
  contentHeight: number,
): TransformState {
  return clampTransform(
    {
      scale: 1,
      x: (viewport.width - contentWidth) / 2,
      y: (viewport.height - contentHeight) / 2,
    },
    viewport,
    contentWidth,
    contentHeight,
  );
}

function resolveViewportSize(container: HTMLDivElement | null, contentWidth: number, contentHeight: number): ViewportSize {
  const measuredWidth = container?.clientWidth ?? 0;
  const measuredHeight = container?.clientHeight ?? 0;

  return {
    width: measuredWidth > 0 ? measuredWidth : contentWidth,
    height: measuredHeight > 0 ? measuredHeight : Math.max(Math.min(contentHeight, 480), 280),
  };
}

export interface PanZoomViewportProps {
  ariaLabel: string;
  children: React.ReactNode;
  contentWidth: number;
  contentHeight: number;
  className?: string;
  testId?: string;
}

export function PanZoomViewport({
  ariaLabel,
  children,
  contentWidth,
  contentHeight,
  className = "",
  testId,
}: PanZoomViewportProps) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const activePointersRef = React.useRef(new Map<number, PointerPoint>());
  const gestureRef = React.useRef<GestureState | null>(null);
  const transformRef = React.useRef<TransformState>({ scale: 1, x: 0, y: 0 });
  const hasInteractedRef = React.useRef(false);

  const [viewportSize, setViewportSize] = React.useState<ViewportSize>({
    width: contentWidth,
    height: Math.max(Math.min(contentHeight, 480), 280),
  });
  const [transform, setTransform] = React.useState<TransformState>(() =>
    buildFitTransform(
      {
        width: contentWidth,
        height: Math.max(Math.min(contentHeight, 480), 280),
      },
      contentWidth,
      contentHeight,
    ),
  );

  const commitTransform = React.useCallback((next: TransformState) => {
    const clamped = clampTransform(next, viewportSize, contentWidth, contentHeight);
    transformRef.current = clamped;
    setTransform(clamped);
  }, [contentHeight, contentWidth, viewportSize]);

  const fitToView = React.useCallback(() => {
    const next = buildFitTransform(viewportSize, contentWidth, contentHeight);
    transformRef.current = next;
    setTransform(next);
  }, [contentHeight, contentWidth, viewportSize]);

  const resetToActualSize = React.useCallback(() => {
    const next = buildActualSizeTransform(viewportSize, contentWidth, contentHeight);
    transformRef.current = next;
    setTransform(next);
  }, [contentHeight, contentWidth, viewportSize]);

  React.useEffect(() => {
    const container = viewportRef.current;
    if (!container) {
      return undefined;
    }

    const updateSize = () => {
      const nextSize = resolveViewportSize(container, contentWidth, contentHeight);
      setViewportSize(nextSize);

      if (!hasInteractedRef.current) {
        const nextTransform = buildFitTransform(nextSize, contentWidth, contentHeight);
        transformRef.current = nextTransform;
        setTransform(nextTransform);
      } else {
        const clamped = clampTransform(transformRef.current, nextSize, contentWidth, contentHeight);
        transformRef.current = clamped;
        setTransform(clamped);
      }
    };

    updateSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateSize());
      observer.observe(container);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [contentHeight, contentWidth]);

  const zoomAtPoint = React.useCallback((nextScale: number, focalPoint: PointerPoint) => {
    const current = transformRef.current;
    const scale = clampScale(nextScale);
    const contentPoint = {
      x: (focalPoint.x - current.x) / current.scale,
      y: (focalPoint.y - current.y) / current.scale,
    };

    commitTransform({
      scale,
      x: focalPoint.x - contentPoint.x * scale,
      y: focalPoint.y - contentPoint.y * scale,
    });
  }, [commitTransform]);

  const startPan = React.useCallback((pointer: PointerPoint) => {
    gestureRef.current = {
      type: "pan",
      origin: transformRef.current,
      startPointer: pointer,
    };
  }, []);

  const startPinch = React.useCallback((first: PointerPoint, second: PointerPoint) => {
    const center = getMidpoint(first, second);
    const current = transformRef.current;
    gestureRef.current = {
      type: "pinch",
      startTransform: current,
      startDistance: Math.max(getDistance(first, second), 1),
      focalContentPoint: {
        x: (center.x - current.x) / current.scale,
        y: (center.y - current.y) / current.scale,
      },
    };
  }, []);

  const releasePointer = React.useCallback((pointerId: number) => {
    activePointersRef.current.delete(pointerId);

    const remaining = Array.from(activePointersRef.current.values());
    if (remaining.length >= 2) {
      startPinch(remaining[0], remaining[1]);
      return;
    }

    if (remaining.length === 1) {
      startPan(remaining[0]);
      return;
    }

    gestureRef.current = null;
  }, [startPan, startPinch]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    hasInteractedRef.current = true;
    activePointersRef.current.set(event.pointerId, point);
    element.setPointerCapture?.(event.pointerId);

    const points = Array.from(activePointersRef.current.values());
    if (points.length >= 2) {
      startPinch(points[0], points[1]);
      return;
    }

    startPan(point);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(event.pointerId)) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const nextPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    activePointersRef.current.set(event.pointerId, nextPoint);

    const points = Array.from(activePointersRef.current.values());
    const gesture = gestureRef.current;
    if (!gesture) {
      return;
    }

    if (points.length >= 2) {
      const first = points[0];
      const second = points[1];

      if (gesture.type !== "pinch") {
        startPinch(first, second);
        return;
      }

      const center = getMidpoint(first, second);
      const scale = clampScale(
        gesture.startTransform.scale * (getDistance(first, second) / gesture.startDistance),
      );

      commitTransform({
        scale,
        x: center.x - gesture.focalContentPoint.x * scale,
        y: center.y - gesture.focalContentPoint.y * scale,
      });
      return;
    }

    if (gesture.type !== "pan") {
      startPan(nextPoint);
      return;
    }

    commitTransform({
      scale: gesture.origin.scale,
      x: gesture.origin.x + (nextPoint.x - gesture.startPointer.x),
      y: gesture.origin.y + (nextPoint.y - gesture.startPointer.y),
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    releasePointer(event.pointerId);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    hasInteractedRef.current = true;

    const rect = event.currentTarget.getBoundingClientRect();
    zoomAtPoint(transformRef.current.scale * Math.exp(-event.deltaY * 0.0015), {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    hasInteractedRef.current = true;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextScale = transformRef.current.scale < 1.4
      ? transformRef.current.scale * 1.6
      : transformRef.current.scale * 0.8;

    zoomAtPoint(nextScale, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const zoomLabel = `${Math.round(transform.scale * 100)}%`;

  return (
    <div className={`relative overflow-hidden rounded-[1.2rem] border border-border/60 bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.08),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.65),rgba(255,255,255,0.35))] ${className}`}>
      <div className="pointer-events-none absolute inset-x-(--space-3) top-(--space-3) z-20 flex items-start justify-between gap-(--space-3)">
        <div className="pointer-events-auto rounded-full border border-border/70 bg-background/88 px-(--space-3) py-(--space-1) text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/58 backdrop-blur-sm">
          Drag to pan · pinch or wheel to zoom
        </div>
        <div data-panzoom-controls="true" className="pointer-events-auto inline-flex items-center gap-(--space-1) rounded-full border border-border/70 bg-background/92 p-(--space-1) text-[11px] shadow-[0_18px_42px_-30px_color-mix(in_srgb,var(--shadow-base)_28%,transparent)] backdrop-blur-sm">
          <button
            type="button"
            onClick={() => zoomAtPoint(transform.scale / 1.2, { x: viewportSize.width / 2, y: viewportSize.height / 2 })}
            className="focus-ring inline-flex h-8 min-w-8 items-center justify-center rounded-full text-foreground/72 transition hover:bg-surface-hover hover:text-foreground"
            aria-label="Zoom out"
          >
            -
          </button>
          <button
            type="button"
            onClick={resetToActualSize}
            className="focus-ring inline-flex min-w-16 items-center justify-center rounded-full px-(--space-2) py-(--space-1) font-semibold text-foreground/72 transition hover:bg-surface-hover hover:text-foreground"
            aria-label="Reset to actual size"
          >
            {zoomLabel}
          </button>
          <button
            type="button"
            onClick={() => zoomAtPoint(transform.scale * 1.2, { x: viewportSize.width / 2, y: viewportSize.height / 2 })}
            className="focus-ring inline-flex h-8 min-w-8 items-center justify-center rounded-full text-foreground/72 transition hover:bg-surface-hover hover:text-foreground"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={fitToView}
            className="focus-ring inline-flex items-center justify-center rounded-full px-(--space-2) py-(--space-1) font-semibold text-foreground/72 transition hover:bg-surface-hover hover:text-foreground"
            aria-label="Fit to view"
          >
            Fit
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        role="figure"
        aria-label={ariaLabel}
        className="relative h-[clamp(18rem,48vw,32rem)] w-full overflow-hidden touch-none"
        data-testid={testId}
        data-scale={transform.scale.toFixed(3)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className="absolute left-0 top-0 will-change-transform"
          style={{
            width: `${contentWidth}px`,
            height: `${contentHeight}px`,
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
            transformOrigin: "0 0",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}