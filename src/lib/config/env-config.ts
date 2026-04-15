import { z } from "zod";

function normalizeOptionalEnv(value: unknown) {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}

const optionalString = z.preprocess(normalizeOptionalEnv, z.string().optional());
const optionalNonEmptyString = z.preprocess(normalizeOptionalEnv, z.string().min(1).optional());
const optionalPositiveInt = z.preprocess(
  normalizeOptionalEnv,
  z.coerce.number().int().positive().optional(),
);

const EnvSchema = z.object({
  // Runtime
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Server
  PORT: z.coerce.number().int().positive().default(3000),

  // API Keys
  ANTHROPIC_API_KEY: optionalNonEmptyString,
  OPENAI_API_KEY: optionalNonEmptyString,

  // Anthropic model / retry config
  ANTHROPIC_MODEL: optionalString,
  ANTHROPIC_REQUEST_TIMEOUT_MS: optionalPositiveInt,
  ANTHROPIC_RETRY_ATTEMPTS: optionalPositiveInt,
  ANTHROPIC_RETRY_DELAY_MS: optionalPositiveInt,
  MEDIA_WORKER_URL: optionalString,
  MEDIA_WORKER_SHARED_SECRET: optionalString,
  MEDIA_WORKER_PORT: optionalPositiveInt,

  // Database
  STUDIO_ORDO_DB_PATH: optionalString,
  DATA_DIR: z.string().default(".data"),

  // Deferred jobs
  DEFERRED_JOB_POLL_INTERVAL_MS: optionalPositiveInt,
  DEFERRED_JOB_WORKER_ID: optionalString,

  // Job event streaming
  JOB_EVENT_STREAM_POLL_INTERVAL_MS: optionalPositiveInt,
  JOB_EVENT_STREAM_MAX_DURATION_MS: optionalPositiveInt,

  // Push notifications
  NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY: optionalString,
  WEB_PUSH_VAPID_PUBLIC_KEY: optionalString,
  WEB_PUSH_VAPID_PRIVATE_KEY: optionalString,
  WEB_PUSH_SUBJECT: optionalString,

  // Auth
  BCRYPT_ROUNDS: optionalPositiveInt,

  // Config
  CONFIG_DIR: optionalString,
  HOSTNAME: optionalString,
  SHUTDOWN_TIMEOUT_MS: optionalPositiveInt,
  ALLOWED_ORIGINS: optionalString,

  // Dev-only feature flags
  ENABLE_DEV_ROLE_SWITCH: optionalString,
});

export type EnvConfig = z.infer<typeof EnvSchema>;

let _config: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (!_config) {
    const result = EnvSchema.safeParse(process.env);
    if (!result.success) {
      const formatted = result.error.flatten();
      throw new Error(
        `Environment validation failed:\n${JSON.stringify(formatted.fieldErrors, null, 2)}`,
      );
    }
    _config = result.data;
  }
  return _config;
}

/** @internal — test-only */
export function _resetEnvConfig(): void {
  _config = null;
}
