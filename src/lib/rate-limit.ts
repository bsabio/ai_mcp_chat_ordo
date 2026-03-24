interface WindowEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(
  windowMs: number,
  maxRequests: number,
): (key: string) => boolean {
  const windows = new Map<string, WindowEntry>();

  // Periodic cleanup every 2× window duration
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of windows) {
      if (now > entry.resetAt + windowMs) {
        windows.delete(key);
      }
    }
  }, windowMs * 2);

  // Allow GC to clean up the interval if the limiter is no longer referenced
  if (typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
  }

  return (key: string): boolean => {
    const now = Date.now();
    const entry = windows.get(key);

    if (!entry || now >= entry.resetAt) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (entry.count < maxRequests) {
      entry.count++;
      return true;
    }

    return false;
  };
}
