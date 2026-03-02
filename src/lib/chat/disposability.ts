export function createAbortTimeout(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  function clear() {
    clearTimeout(timer);
  }

  return {
    controller,
    clear,
  };
}

export async function safeCancelReader(reader: ReadableStreamDefaultReader<Uint8Array>) {
  try {
    await reader.cancel();
  } catch {
    // best-effort cleanup
  }
}
