/**
 * Shared form parser utilities extracted from journal admin actions.
 * Every admin BREAD surface reuses these to parse FormData into typed values.
 */

export function readRequiredText(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required field: ${key}`);
  }
  return value.trim();
}

export function readOptionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function readRequiredEnum<T extends string>(
  formData: FormData,
  key: string,
  valid: readonly T[],
): T {
  const raw = readRequiredText(formData, key);
  if (!(valid as readonly string[]).includes(raw)) {
    throw new Error(`Invalid value for ${key}: ${raw}. Expected one of: ${valid.join(", ")}`);
  }
  return raw as T;
}

export function readOptionalEnum<T extends string>(
  formData: FormData,
  key: string,
  valid: readonly T[],
): T | null {
  const raw = readOptionalText(formData, key);
  if (raw === null) return null;
  if (!(valid as readonly string[]).includes(raw)) {
    throw new Error(`Invalid value for ${key}: ${raw}. Expected one of: ${valid.join(", ")}`);
  }
  return raw as T;
}
