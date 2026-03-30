import { z } from "zod";

const EnvSchema = z.object({
  // Runtime
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Server
  PORT: z.coerce.number().int().positive().default(3000),

  // API Keys
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  API__ANTHROPIC_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  API__OPENAI_API_KEY: z.string().min(1).optional(),

  // Anthropic model / retry config
  ANTHROPIC_MODEL: z.string().optional(),
  API__ANTHROPIC_MODEL: z.string().optional(),
  ANTHROPIC_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  API__ANTHROPIC_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  ANTHROPIC_RETRY_ATTEMPTS: z.coerce.number().int().positive().optional(),
  API__ANTHROPIC_RETRY_ATTEMPTS: z.coerce.number().int().positive().optional(),
  ANTHROPIC_RETRY_DELAY_MS: z.coerce.number().int().positive().optional(),
  API__ANTHROPIC_RETRY_DELAY_MS: z.coerce.number().int().positive().optional(),

  // Database
  STUDIO_ORDO_DB_PATH: z.string().optional(),
  DATA_DIR: z.string().default(".data"),

  // Deferred jobs
  DEFERRED_JOB_POLL_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  DEFERRED_JOB_WORKER_ID: z.string().optional(),

  // Job event streaming
  JOB_EVENT_STREAM_POLL_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  JOB_EVENT_STREAM_MAX_DURATION_MS: z.coerce
    .number()
    .int()
    .positive()
    .optional(),

  // Push notifications
  NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY: z.string().optional(),
  WEB_PUSH_VAPID_PUBLIC_KEY: z.string().optional(),
  WEB_PUSH_VAPID_PRIVATE_KEY: z.string().optional(),
  WEB_PUSH_SUBJECT: z.string().optional(),

  // Auth
  BCRYPT_ROUNDS: z.coerce.number().int().positive().optional(),

  // Config
  CONFIG_DIR: z.string().optional(),
  HOSTNAME: z.string().optional(),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  ALLOWED_ORIGINS: z.string().optional(),

  // Dev-only feature flags
  ENABLE_DEV_ROLE_SWITCH: z.string().optional(),
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
