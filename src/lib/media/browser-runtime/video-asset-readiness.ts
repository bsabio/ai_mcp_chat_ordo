type WaitForPlayableVideoAssetOptions = {
  uri: string;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export class VideoPlaybackVerificationError extends Error {
  readonly code: "playback_readiness_timeout" | "playback_verification_failed";

  constructor(
    code: "playback_readiness_timeout" | "playback_verification_failed",
    message: string,
  ) {
    super(message);
    this.name = "VideoPlaybackVerificationError";
    this.code = code;
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new Error("aborted");
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);

    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, ms);

    const handleAbort = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", handleAbort);
      reject(new Error("aborted"));
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

function waitForVideoCanPlay(uri: string, timeoutMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);

    const video = document.createElement("video");
    let settled = false;

    const cleanup = () => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", handleAbort);
      video.removeEventListener("canplay", handleSuccess);
      video.removeEventListener("loadeddata", handleSuccess);
      video.removeEventListener("error", handleError);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    const handleSuccess = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new VideoPlaybackVerificationError(
        "playback_verification_failed",
        "Video asset is not yet playable.",
      ));
    };

    const handleAbort = () => {
      cleanup();
      reject(new Error("aborted"));
    };

    const timer = window.setTimeout(() => {
      cleanup();
      reject(new VideoPlaybackVerificationError(
        "playback_readiness_timeout",
        "Timed out waiting for video playback readiness.",
      ));
    }, timeoutMs);

    signal?.addEventListener("abort", handleAbort, { once: true });
    video.addEventListener("canplay", handleSuccess, { once: true });
    video.addEventListener("loadeddata", handleSuccess, { once: true });
    video.addEventListener("error", handleError, { once: true });
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = uri;
    video.load();
  });
}

export async function waitForPlayableVideoAsset(options: WaitForPlayableVideoAssetOptions): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const deadline = Date.now() + timeoutMs;
  let lastError: Error | null = null;

  while (Date.now() < deadline) {
    throwIfAborted(options.signal);

    try {
      await waitForVideoCanPlay(options.uri, Math.min(4_000, deadline - Date.now()), options.signal);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (lastError.message === "aborted") {
        throw lastError;
      }
      await delay(350, options.signal);
    }
  }

  throw lastError ?? new VideoPlaybackVerificationError(
    "playback_readiness_timeout",
    "Timed out waiting for video playback readiness.",
  );
}