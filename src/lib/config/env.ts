const EMPTY_ENV_MESSAGE = "must be set to a non-empty value";
const warnedLegacyKeys = new Set<string>();

function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function warnLegacy(legacyKey: string, primaryKey: string) {
  if (warnedLegacyKeys.has(legacyKey)) {
    return;
  }

  warnedLegacyKeys.add(legacyKey);
  console.warn(
    `Deprecated environment variable ${legacyKey} is in use. Prefer ${primaryKey} for new deployments.`,
  );
}

function requireNonEmpty(value: string | undefined, keysLabel: string): string {
  if (!value) {
    throw new Error(`${keysLabel} ${EMPTY_ENV_MESSAGE}.`);
  }

  return value;
}

function readPrimaryThenLegacy(
  primaryKey: string,
  legacyKey: string,
): string | undefined {
  const primary = readEnv(primaryKey);
  if (primary) {
    return primary;
  }

  const legacy = readEnv(legacyKey);
  if (legacy) {
    warnLegacy(legacyKey, primaryKey);
    return legacy;
  }

  return undefined;
}

export function getAnthropicApiKey(): string {
  const value = readPrimaryThenLegacy(
    "ANTHROPIC_API_KEY",
    "API__ANTHROPIC_API_KEY",
  );
  return requireNonEmpty(value, "ANTHROPIC_API_KEY/API__ANTHROPIC_API_KEY");
}

export function getOpenaiApiKey(): string {
  const value = readPrimaryThenLegacy(
    "OPENAI_API_KEY",
    "API__OPENAI_API_KEY",
  );
  return requireNonEmpty(value, "OPENAI_API_KEY/API__OPENAI_API_KEY");
}

export function getAnthropicModel(): string {
  return (
    readPrimaryThenLegacy("ANTHROPIC_MODEL", "API__ANTHROPIC_MODEL") ??
    "claude-haiku-4-5"
  );
}

function parsePositiveIntegerEnv(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function getAnthropicRequestTimeoutMs(): number {
  return parsePositiveIntegerEnv(
    readPrimaryThenLegacy("ANTHROPIC_REQUEST_TIMEOUT_MS", "API__ANTHROPIC_REQUEST_TIMEOUT_MS"),
    12000,
  );
}

export function getAnthropicRequestRetryAttempts(): number {
  return parsePositiveIntegerEnv(
    readPrimaryThenLegacy("ANTHROPIC_RETRY_ATTEMPTS", "API__ANTHROPIC_RETRY_ATTEMPTS"),
    3,
  );
}

export function getAnthropicRequestRetryDelayMs(): number {
  return parsePositiveIntegerEnv(
    readPrimaryThenLegacy("ANTHROPIC_RETRY_DELAY_MS", "API__ANTHROPIC_RETRY_DELAY_MS"),
    150,
  );
}

export function getModelFallbacks(): string[] {
  const configured = readPrimaryThenLegacy(
    "ANTHROPIC_MODEL",
    "API__ANTHROPIC_MODEL",
  );
  const models = [
    configured,
    "claude-haiku-4-5",
    "claude-sonnet-4-6",
    "claude-opus-4-6",
  ].filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );

  return [...new Set(models)];
}

export function validateRequiredRuntimeConfig() {
  getAnthropicApiKey();
}
