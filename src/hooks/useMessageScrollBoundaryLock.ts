import { useEffect, type RefObject } from "react";

import { SCROLL_BOTTOM_THRESHOLD_PX } from "@/lib/ui/scrollConstants";

const BOUNDARY_EPSILON = SCROLL_BOTTOM_THRESHOLD_PX;

function isEditableElement(target: Element | null): boolean {
  if (!target) {
    return false;
  }

  const interactive = target.closest(
    "input, textarea, select, button, a, [contenteditable='true'], [data-boundary-lock-ignore='true']",
  );

  return !!interactive;
}

function isAtTop(element: HTMLElement): boolean {
  return element.scrollTop <= BOUNDARY_EPSILON;
}

function isAtBottom(element: HTMLElement): boolean {
  return element.scrollHeight - element.clientHeight - element.scrollTop <= BOUNDARY_EPSILON;
}

function shouldPreventBoundaryEscape(element: HTMLElement, deltaY: number): boolean {
  if (deltaY < 0) {
    return isAtTop(element);
  }

  if (deltaY > 0) {
    return isAtBottom(element);
  }

  return false;
}

function getEventElement(target: EventTarget | null): Element | null {
  return target instanceof Element ? target : null;
}

interface TouchPointLike {
  clientY: number;
}

function getTouchY(event: TouchEvent): number | null {
  const touch = (event.touches?.[0] ?? event.changedTouches?.[0]) as TouchPointLike | undefined;
  return typeof touch?.clientY === "number" ? touch.clientY : null;
}

export function useMessageScrollBoundaryLock(
  targetRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const element = targetRef.current;
    if (!element) {
      return;
    }

    let lastTouchY: number | null = null;

    const handleWheel = (event: WheelEvent) => {
      const target = getEventElement(event.target);
      if (isEditableElement(target)) {
        return;
      }

      if (shouldPreventBoundaryEscape(element, event.deltaY)) {
        event.preventDefault();
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      const target = getEventElement(event.target);
      if (isEditableElement(target)) {
        lastTouchY = null;
        return;
      }

      lastTouchY = getTouchY(event);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const target = getEventElement(event.target);
      if (isEditableElement(target)) {
        return;
      }

      const nextTouchY = getTouchY(event);
      if (nextTouchY === null || lastTouchY === null) {
        return;
      }

      const deltaY = lastTouchY - nextTouchY;
      lastTouchY = nextTouchY;

      if (shouldPreventBoundaryEscape(element, deltaY)) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      lastTouchY = null;
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd);
    element.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      element.removeEventListener("wheel", handleWheel);
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [enabled, targetRef]);
}