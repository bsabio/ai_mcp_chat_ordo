export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`);
    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value);
}

export function buildDeferredJobDedupeKey(
  conversationId: string,
  toolName: string,
  payload: Record<string, unknown>,
): string {
  return `${conversationId}:${toolName}:${stableStringify(payload)}`;
}