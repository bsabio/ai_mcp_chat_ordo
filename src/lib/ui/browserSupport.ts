export type SafeAreaEdge = "top" | "right" | "bottom" | "left";

type SupportsFunction = (query: string) => boolean;
type MediaQueryLike = { matches: boolean };
type MatchMediaFunction = (query: string) => MediaQueryLike;
type ScrollableLike = {
  scrollHeight: number;
  scrollTop: number;
  scrollTo?: (options: ScrollToOptions) => void;
};
type ScrollIntoViewLike = {
  scrollIntoView?: (options?: ScrollIntoViewOptions) => void;
};
type RequestAnimationFrameLike = (callback: FrameRequestCallback) => number;
type CancelAnimationFrameLike = (handle: number) => void;
type AudioConstructorLike = new (src?: string) => HTMLAudioElement;
type IntersectionObserverWindowLike = { IntersectionObserver?: typeof IntersectionObserver };
type ReadableStreamBodyLike = { getReader?: () => ReadableStreamDefaultReader<Uint8Array> } | null | undefined;
type ReadableStreamWithReader = { getReader: () => ReadableStreamDefaultReader<Uint8Array> };

function getSupportsFunction(explicitSupports?: SupportsFunction): SupportsFunction | null {
  if (explicitSupports) {
    return explicitSupports;
  }

  if (typeof CSS !== "undefined" && typeof CSS.supports === "function") {
    return CSS.supports.bind(CSS);
  }

  return null;
}

export function supportsViewTransitions(
  target: Pick<Document, "startViewTransition"> | null =
    typeof document === "undefined" ? null : document,
): boolean {
  return !!target && typeof target.startViewTransition === "function";
}

export function supportsBackdropBlur(explicitSupports?: SupportsFunction): boolean {
  const supports = getSupportsFunction(explicitSupports);
  if (!supports) {
    return false;
  }

  return (
    supports("backdrop-filter: blur(1px)") ||
    supports("-webkit-backdrop-filter: blur(1px)")
  );
}

export function supportsDynamicViewportUnits(explicitSupports?: SupportsFunction): boolean {
  const supports = getSupportsFunction(explicitSupports);
  if (!supports) {
    return false;
  }

  return supports("height: 100dvh");
}

export function supportsReducedMotion(
  query: MediaQueryLike | null =
    typeof window === "undefined" || typeof window.matchMedia !== "function"
      ? null
      : window.matchMedia("(prefers-reduced-motion: reduce)"),
): boolean {
  return !!query?.matches;
}

export function prefersDarkColorScheme(
  matchMedia: MatchMediaFunction | null =
    typeof window === "undefined" || typeof window.matchMedia !== "function"
      ? null
      : window.matchMedia.bind(window),
): boolean {
  if (!matchMedia) {
    return false;
  }

  return !!matchMedia("(prefers-color-scheme: dark)")?.matches;
}

export function supportsReadableStreamReader(
  body: ReadableStreamBodyLike,
): body is ReadableStreamWithReader {
  return !!body && typeof body.getReader === "function";
}

export function supportsIntersectionObserver(
  target: IntersectionObserverWindowLike | null =
    typeof window === "undefined" ? null : window,
): boolean {
  return !!target && typeof target.IntersectionObserver === "function";
}

export function createAudioElement(
  url: string,
  audioConstructor: AudioConstructorLike | null =
    typeof Audio === "undefined" ? null : Audio,
): HTMLAudioElement | null {
  if (!audioConstructor) {
    return null;
  }

  return new audioConstructor(url);
}

export function getSafeAreaInsetVar(edge: SafeAreaEdge, fallback = "0px"): string {
  return `env(safe-area-inset-${edge}, ${fallback})`;
}

export function getSafeAreaPaddingValue(
  edge: SafeAreaEdge,
  minimum = "0px",
  fallback = "0px",
): string {
  return `max(${minimum}, ${getSafeAreaInsetVar(edge, fallback)})`;
}

export function getViewportBlockSizeValue(explicitSupports?: SupportsFunction): string {
  return supportsDynamicViewportUnits(explicitSupports) ? "100dvh" : "100vh";
}

export function getAutoScrollBehavior(): ScrollBehavior {
  return "auto";
}

export function getUserScrollBehavior(): ScrollBehavior {
  return "smooth";
}

export function scrollElementTo(
  target: ScrollableLike | null,
  top: number,
  behavior: ScrollBehavior = getAutoScrollBehavior(),
): void {
  if (!target) {
    return;
  }

  if (typeof target.scrollTo === "function") {
    target.scrollTo({ top, behavior });
    return;
  }

  target.scrollTop = top;
}

export function scrollElementIntoView(
  target: ScrollIntoViewLike | null,
  behavior: ScrollBehavior = getUserScrollBehavior(),
  block: ScrollLogicalPosition = "center",
): void {
  target?.scrollIntoView?.({ behavior, block });
}

export function scheduleAfterPaint(
  callback: () => void,
  requestFrame: RequestAnimationFrameLike | null =
    typeof requestAnimationFrame === "function" ? requestAnimationFrame : null,
  cancelFrame: CancelAnimationFrameLike | null =
    typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : null,
): () => void {
  if (requestFrame && cancelFrame) {
    let innerHandle: number | null = null;
    const outerHandle = requestFrame(() => {
      innerHandle = requestFrame(() => callback());
    });
    return () => {
      cancelFrame(outerHandle);
      if (innerHandle != null) {
        cancelFrame(innerHandle);
      }
    };
  }

  const handle = window.setTimeout(callback, 0);
  return () => window.clearTimeout(handle);
}
