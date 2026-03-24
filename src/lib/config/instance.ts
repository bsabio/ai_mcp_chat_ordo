/**
 * Instance config loader — reads JSON config files from disk, validates,
 * caches for the process lifetime. Falls back to hardcoded defaults when
 * config files are absent. Throws ConfigValidationError when files exist
 * but contain invalid content.
 *
 * Server-side only — uses node:fs and node:path. Client components
 * receive config values through InstanceConfigContext instead.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  validateIdentity,
  validatePrompts,
  validateServices,
  validateTools,
} from "./instance.schema";
import {
  DEFAULT_IDENTITY,
  DEFAULT_PROMPTS,
  DEFAULT_SERVICES,
  DEFAULT_TOOLS,
  type FullInstanceConfig,
  type InstanceIdentity,
  type InstancePrompts,
  type InstanceServices,
  type InstanceTools,
} from "./defaults";

// ── Error type ──────────────────────────────────────────────────────

export class ConfigValidationError extends Error {
  constructor(
    public readonly file: string,
    public readonly violations: string[],
  ) {
    super(`Invalid ${file}: ${violations.join("; ")}`);
    this.name = "ConfigValidationError";
  }
}

// ── Internal helpers ────────────────────────────────────────────────

function getConfigDir(): string {
  return resolve(process.env.CONFIG_DIR ?? "config");
}

function readJsonFile(dir: string, filename: string): unknown | null {
  const filePath = join(dir, filename);
  if (!existsSync(filePath)) return null;

  const raw = readFileSync(filePath, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    throw new ConfigValidationError(filename, [
      `${filename} contains invalid JSON`,
    ]);
  }
}

function mergeWithDefaults<T extends object>(defaults: T, parsed: T): T {
  return { ...defaults, ...parsed };
}

// ── Loader ──────────────────────────────────────────────────────────

export function loadInstanceConfig(): FullInstanceConfig {
  const dir = getConfigDir();

  // Identity
  const rawIdentity = readJsonFile(dir, "identity.json");
  let identity = DEFAULT_IDENTITY;
  if (rawIdentity !== null) {
    const result = validateIdentity(rawIdentity);
    if (Array.isArray(result)) {
      throw new ConfigValidationError("identity.json", result);
    }
    identity = mergeWithDefaults(DEFAULT_IDENTITY, result);
  }

  // Prompts
  const rawPrompts = readJsonFile(dir, "prompts.json");
  let prompts = DEFAULT_PROMPTS;
  if (rawPrompts !== null) {
    const result = validatePrompts(rawPrompts);
    if (Array.isArray(result)) {
      throw new ConfigValidationError("prompts.json", result);
    }
    prompts = mergeWithDefaults(DEFAULT_PROMPTS, result);
  }

  // Services
  const rawServices = readJsonFile(dir, "services.json");
  let services = DEFAULT_SERVICES;
  if (rawServices !== null) {
    const result = validateServices(rawServices);
    if (Array.isArray(result)) {
      throw new ConfigValidationError("services.json", result);
    }
    services = mergeWithDefaults(DEFAULT_SERVICES, result);
  }

  // Tools
  const rawTools = readJsonFile(dir, "tools.json");
  let tools = DEFAULT_TOOLS;
  if (rawTools !== null) {
    const result = validateTools(rawTools);
    if (Array.isArray(result)) {
      throw new ConfigValidationError("tools.json", result);
    }
    tools = mergeWithDefaults(DEFAULT_TOOLS, result);
  }

  return { identity, prompts, services, tools };
}

// ── Cached accessors ────────────────────────────────────────────────

let _cache: FullInstanceConfig | null = null;

function ensureLoaded(): FullInstanceConfig {
  if (!_cache) {
    _cache = loadInstanceConfig();
  }
  return _cache;
}

export function getInstanceIdentity(): InstanceIdentity {
  return ensureLoaded().identity;
}

export function getInstancePrompts(): InstancePrompts {
  return ensureLoaded().prompts;
}

export function getInstanceServices(): InstanceServices {
  return ensureLoaded().services;
}

export function getInstanceTools(): InstanceTools {
  return ensureLoaded().tools;
}

/** Reset the config cache — exported for tests only. */
export function resetConfigCache(): void {
  _cache = null;
}
