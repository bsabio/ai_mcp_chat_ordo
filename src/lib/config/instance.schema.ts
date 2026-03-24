/**
 * Hand-written runtime validation for config schemas.
 * No Zod dependency — plain TypeScript validators that return
 * either the typed object or an array of human-readable error strings.
 */

import type {
  InstanceIdentity,
  InstancePrompts,
  InstanceServices,
  InstanceTools,
} from "./defaults";

// ── Helpers ─────────────────────────────────────────────────────────

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function checkString(
  obj: Record<string, unknown>,
  field: string,
  prefix: string,
  errors: string[],
  opts: { required?: boolean; maxLength?: number; pattern?: RegExp; patternMsg?: string } = {},
): void {
  const val = obj[field];
  const { required = true, maxLength, pattern, patternMsg } = opts;

  if (val === undefined || val === null) {
    if (required) errors.push(`${prefix}.${field}: required non-empty string`);
    return;
  }

  if (typeof val !== "string") {
    errors.push(`${prefix}.${field}: must be a string`);
    return;
  }

  if (required && val.trim() === "") {
    errors.push(`${prefix}.${field}: required non-empty string`);
    return;
  }

  if (maxLength && val.length > maxLength) {
    errors.push(`${prefix}.${field}: max ${maxLength} characters`);
  }

  if (pattern && !pattern.test(val)) {
    errors.push(`${prefix}.${field}: ${patternMsg ?? "invalid format"}`);
  }
}

// ── identity.json ───────────────────────────────────────────────────

export function validateIdentity(raw: unknown): InstanceIdentity | string[] {
  const errors: string[] = [];

  if (!isObject(raw)) return ["identity.json must be a JSON object"];

  checkString(raw, "name", "identity", errors, { maxLength: 100 });
  checkString(raw, "shortName", "identity", errors, { maxLength: 20 });
  checkString(raw, "tagline", "identity", errors, { maxLength: 200 });
  checkString(raw, "description", "identity", errors, { maxLength: 500 });
  checkString(raw, "domain", "identity", errors, {
    maxLength: 253,
    pattern: /^[^/:]+$/,
    patternMsg: "must not include protocol",
  });
  checkString(raw, "logoPath", "identity", errors, {
    pattern: /^\//,
    patternMsg: "must start with /",
  });
  checkString(raw, "markText", "identity", errors, { maxLength: 5 });

  // Optional fields
  if (raw.accentColor !== undefined) {
    checkString(raw, "accentColor", "identity", errors, { required: false });
  }
  if (raw.copyright !== undefined) {
    checkString(raw, "copyright", "identity", errors, { required: false });
  }
  if (raw.serviceChips !== undefined) {
    if (!Array.isArray(raw.serviceChips)) {
      errors.push("identity.serviceChips: must be an array");
    } else if (raw.serviceChips.length < 1 || raw.serviceChips.length > 8) {
      errors.push("identity.serviceChips: must contain 1–8 items");
    } else {
      for (let i = 0; i < raw.serviceChips.length; i++) {
        const chip = raw.serviceChips[i];
        if (typeof chip !== "string" || chip.trim() === "") {
          errors.push(`identity.serviceChips[${i}]: must be non-empty string`);
        }
      }
    }
  }

  if (raw.fonts !== undefined) {
    if (!isObject(raw.fonts)) {
      errors.push("identity.fonts: must be an object with body, display, and mono");
    } else {
      checkString(raw.fonts, "body", "identity.fonts", errors, { maxLength: 100 });
      checkString(raw.fonts, "display", "identity.fonts", errors, { maxLength: 100 });
      checkString(raw.fonts, "mono", "identity.fonts", errors, { maxLength: 100 });
    }
  }

  if (raw.analytics !== undefined) {
    if (!isObject(raw.analytics)) {
      errors.push("identity.analytics: must be an object");
    } else {
      if (raw.analytics.plausibleDomain !== undefined) {
        checkString(raw.analytics, "plausibleDomain", "identity.analytics", errors, { required: false, maxLength: 253 });
      }
      if (raw.analytics.plausibleSrc !== undefined) {
        checkString(raw.analytics, "plausibleSrc", "identity.analytics", errors, { required: false, maxLength: 500 });
      }
    }
  }

  return errors.length > 0 ? errors : (raw as unknown as InstanceIdentity);
}

// ── prompts.json ────────────────────────────────────────────────────

export function validatePrompts(raw: unknown): InstancePrompts | string[] {
  const errors: string[] = [];

  if (!isObject(raw)) return ["prompts.json must be a JSON object"];

  if (raw.personality !== undefined) {
    if (typeof raw.personality !== "string") {
      errors.push("prompts.personality: must be a string");
    } else if (raw.personality.length > 5000) {
      errors.push("prompts.personality: max 5000 characters");
    }
  }

  if (raw.heroHeading !== undefined) {
    if (typeof raw.heroHeading !== "string") {
      errors.push("prompts.heroHeading: must be a string");
    } else if (raw.heroHeading.length > 100) {
      errors.push("prompts.heroHeading: max 100 characters");
    }
  }

  if (raw.heroSubheading !== undefined) {
    if (typeof raw.heroSubheading !== "string") {
      errors.push("prompts.heroSubheading: must be a string");
    } else if (raw.heroSubheading.length > 300) {
      errors.push("prompts.heroSubheading: max 300 characters");
    }
  }

  if (raw.firstMessage !== undefined) {
    if (!isObject(raw.firstMessage)) {
      errors.push("prompts.firstMessage: must be an object");
    } else {
      if (raw.firstMessage.default !== undefined) {
        if (typeof raw.firstMessage.default !== "string") {
          errors.push("prompts.firstMessage.default: must be a string");
        } else if ((raw.firstMessage.default as string).length > 1000) {
          errors.push("prompts.firstMessage.default: max 1000 characters");
        }
      }
      if (raw.firstMessage.withReferral !== undefined) {
        if (typeof raw.firstMessage.withReferral !== "string") {
          errors.push("prompts.firstMessage.withReferral: must be a string");
        } else if ((raw.firstMessage.withReferral as string).length > 1000) {
          errors.push("prompts.firstMessage.withReferral: max 1000 characters");
        }
      }
    }
  }

  if (raw.defaultSuggestions !== undefined) {
    if (!Array.isArray(raw.defaultSuggestions)) {
      errors.push("prompts.defaultSuggestions: must be an array");
    } else if (raw.defaultSuggestions.length > 6) {
      errors.push("prompts.defaultSuggestions: max 6 items");
    } else {
      for (let i = 0; i < raw.defaultSuggestions.length; i++) {
        const s = raw.defaultSuggestions[i];
        if (typeof s !== "string" || s.trim() === "") {
          errors.push(`prompts.defaultSuggestions[${i}]: must be non-empty string`);
        } else if (s.length > 100) {
          errors.push(`prompts.defaultSuggestions[${i}]: max 100 characters`);
        }
      }
    }
  }

  if (raw.referralSuggestions !== undefined) {
    if (!Array.isArray(raw.referralSuggestions)) {
      errors.push("prompts.referralSuggestions: must be an array");
    } else if (raw.referralSuggestions.length > 6) {
      errors.push("prompts.referralSuggestions: max 6 items");
    } else {
      for (let i = 0; i < raw.referralSuggestions.length; i++) {
        const s = raw.referralSuggestions[i];
        if (typeof s !== "string" || s.trim() === "") {
          errors.push(`prompts.referralSuggestions[${i}]: must be non-empty string`);
        } else if (s.length > 100) {
          errors.push(`prompts.referralSuggestions[${i}]: max 100 characters`);
        }
      }
    }
  }

  return errors.length > 0 ? errors : (raw as unknown as InstancePrompts);
}

// ── services.json ───────────────────────────────────────────────────

const VALID_LANES = new Set(["organization", "individual", "both"]);

function validateOffering(
  raw: unknown,
  index: number,
  errors: string[],
): void {
  const prefix = `offerings[${index}]`;

  if (!isObject(raw)) {
    errors.push(`${prefix}: must be an object`);
    return;
  }

  checkString(raw, "id", prefix, errors, {
    maxLength: 100,
    pattern: /^[a-zA-Z0-9-]+$/,
    patternMsg: "alphanumeric and hyphens only",
  });
  checkString(raw, "name", prefix, errors, { maxLength: 200 });
  checkString(raw, "description", prefix, errors, { maxLength: 2000 });

  if (raw.lane === undefined || raw.lane === null) {
    errors.push(`${prefix}.lane: required`);
  } else if (typeof raw.lane !== "string" || !VALID_LANES.has(raw.lane)) {
    errors.push(
      `${prefix}.lane: must be organization, individual, or both`,
    );
  }

  if (raw.estimatedPrice !== undefined) {
    if (typeof raw.estimatedPrice !== "number" || !Number.isInteger(raw.estimatedPrice) || raw.estimatedPrice < 0) {
      errors.push(`${prefix}.estimatedPrice: must be non-negative integer`);
    }
  }

  if (raw.estimatedHours !== undefined) {
    if (typeof raw.estimatedHours !== "number" || raw.estimatedHours <= 0) {
      errors.push(`${prefix}.estimatedHours: must be positive number`);
    }
  }
}

export function validateServices(raw: unknown): InstanceServices | string[] {
  const errors: string[] = [];

  if (!isObject(raw)) return ["services.json must be a JSON object"];

  if (raw.bookingEnabled === undefined || raw.bookingEnabled === null) {
    errors.push("services.bookingEnabled: required boolean");
  } else if (typeof raw.bookingEnabled !== "boolean") {
    errors.push("services.bookingEnabled: must be a boolean");
  }

  if (raw.offerings === undefined || raw.offerings === null) {
    errors.push("services.offerings: required array");
  } else if (!Array.isArray(raw.offerings)) {
    errors.push("services.offerings: must be an array");
  } else {
    for (let i = 0; i < raw.offerings.length; i++) {
      validateOffering(raw.offerings[i], i, errors);
    }
  }

  return errors.length > 0
    ? errors
    : (raw as unknown as InstanceServices);
}

// ── tools.json ──────────────────────────────────────────────────────

function validateStringArray(
  arr: unknown,
  fieldName: string,
  errors: string[],
): void {
  if (!Array.isArray(arr)) {
    errors.push(`tools.${fieldName}: must be an array`);
    return;
  }
  for (let i = 0; i < arr.length; i++) {
    if (typeof arr[i] !== "string" || (arr[i] as string).trim() === "") {
      errors.push(`tools.${fieldName}[${i}]: must be non-empty string`);
    }
  }
}

export function validateTools(raw: unknown): InstanceTools | string[] {
  const errors: string[] = [];

  if (!isObject(raw)) return ["tools.json must be a JSON object"];

  if (raw.enabled !== undefined) {
    validateStringArray(raw.enabled, "enabled", errors);
  }

  if (raw.disabled !== undefined) {
    validateStringArray(raw.disabled, "disabled", errors);
  }

  return errors.length > 0 ? errors : (raw as unknown as InstanceTools);
}
