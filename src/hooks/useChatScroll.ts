import { useEffect, useRef, useState, useCallback, type RefObject } from "react";

export function useChatScroll<T>(dep: T): {
  scrollRef: RefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  handleScroll: () => void;
} {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  // Track whether the user deliberately scrolled away from the bottom
  const userScrolledUp = useRef(false);
  const prevScrollTop = useRef(0);

  const checkIfAtBottom = useCallback(() => {
    if (!scrollRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    return scrollHeight - scrollTop - clientHeight < 150;
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop } = scrollRef.current;
    const atBottom = checkIfAtBottom();

    // Detect deliberate upward scroll (scrollTop decreased by more than a small threshold)
    if (scrollTop < prevScrollTop.current - 10) {
      userScrolledUp.current = true;
    }

    // Reset when user reaches the bottom again
    if (atBottom) {
      userScrolledUp.current = false;
    }

    prevScrollTop.current = scrollTop;
    setIsAtBottom(atBottom);
  }, [checkIfAtBottom]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
      userScrolledUp.current = false;
      setIsAtBottom(true);
    }
  }, []);

  // Auto-scroll when content changes, unless the user deliberately scrolled up
  useEffect(() => {
    if (userScrolledUp.current) return;

    // requestAnimationFrame ensures the DOM has painted the new content
    const raf = requestAnimationFrame(() => {
      if (scrollRef.current) {
        // Use instant scroll during streaming to avoid stutter from queued smooth scrolls
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "instant",
        });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [dep]);

  return { scrollRef, isAtBottom, scrollToBottom, handleScroll };
}
