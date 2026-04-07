import { useEffect, useRef, useState, useCallback, type RefObject } from "react";

import {
  getAutoScrollBehavior,
  getUserScrollBehavior,
  scheduleAfterPaint,
  scrollElementTo,
} from "@/lib/ui/browserSupport";
import { SCROLL_BOTTOM_THRESHOLD_PX } from "@/lib/ui/scrollConstants";

function getPinnedScrollTop(element: HTMLDivElement): number {
  return Math.max(element.scrollHeight - element.clientHeight, 0);
}

function pinToBottom(
  element: HTMLDivElement,
  behavior: ScrollBehavior,
): boolean {
  scrollElementTo(element, getPinnedScrollTop(element), behavior);
  const { scrollTop, scrollHeight, clientHeight } = element;
  return scrollHeight - scrollTop - clientHeight <= SCROLL_BOTTOM_THRESHOLD_PX;
}

export function useChatScroll<T>(dep: T): {
  scrollRef: RefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  handleScroll: () => void;
  /**
   * Re-pin to bottom on the next dep change, regardless of current
   * pinnedToBottom state.  Call this when the message list is entirely
   * replaced (conversation switch, initial load) so the viewport
   * anchors to the latest content.
   */
  resetPin: () => void;
} {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const pinnedToBottom = useRef(true);

  const checkIfAtBottom = useCallback(() => {
    if (!scrollRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    return scrollHeight - scrollTop - clientHeight <= SCROLL_BOTTOM_THRESHOLD_PX;
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const atBottom = checkIfAtBottom();
    pinnedToBottom.current = atBottom;
    setIsAtBottom(atBottom);
  }, [checkIfAtBottom]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = getUserScrollBehavior()) => {
    if (scrollRef.current) {
      pinToBottom(scrollRef.current, behavior);
      pinnedToBottom.current = true;
      setIsAtBottom(true);
    }
  }, []);

  const resetPin = useCallback(() => {
    pinnedToBottom.current = true;
    setIsAtBottom(true);
  }, []);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const viewport = scrollRef.current;
    const content = viewport?.firstElementChild;
    if (!viewport || !(content instanceof HTMLElement)) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (!pinnedToBottom.current || !scrollRef.current) {
        return;
      }

      const atBottom = pinToBottom(scrollRef.current, getAutoScrollBehavior());
      pinnedToBottom.current = atBottom;
      setIsAtBottom(atBottom);
    });

    observer.observe(content);
    return () => {
      observer.disconnect();
    };
  }, [dep]);

  useEffect(() => {
    if (!pinnedToBottom.current) return;

    const cleanup = scheduleAfterPaint(() => {
      if (scrollRef.current) {
        const atBottom = pinToBottom(scrollRef.current, getAutoScrollBehavior());
        pinnedToBottom.current = atBottom;
        setIsAtBottom(atBottom);
      }
    });
    return cleanup;
  }, [checkIfAtBottom, dep]);

  return { scrollRef, isAtBottom, scrollToBottom, handleScroll, resetPin };
}
