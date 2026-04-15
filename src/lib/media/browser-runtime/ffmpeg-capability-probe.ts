export function probeFfmpegWasmCapability(): {
  isAvailable: boolean;
  reason?: string;
} {
  if (typeof window === "undefined") {
    return { isAvailable: false, reason: "Probe must run in a browser context." };
  }

  // FFmpeg multi-threading requires SharedArrayBuffer which requires COOP and COEP headers
  if (typeof SharedArrayBuffer === "undefined") {
    return {
      isAvailable: false,
      reason:
        "SharedArrayBuffer is absent. The server must provide Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp headers.",
    };
  }

  // Basic check for web workers
  if (typeof Worker === "undefined") {
    return {
      isAvailable: false,
      reason: "Web Workers are not supported in this browser.",
    };
  }

  return { isAvailable: true };
}
