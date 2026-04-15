# Sprint 4 Artifact — Provider Observability Field Map

> This artifact documents the structured event contract for provider
> lifecycle observability. Both stream and direct-turn paths emit
> the same event shape through `emitProviderEvent()`.

## Event Schema: `ProviderAttemptEvent`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `kind` | `ProviderEventKind` | ✅ | Lifecycle stage (see below) |
| `surface` | `"stream" \| "direct_turn"` | ✅ | Which chat transport emitted this event |
| `model` | `string` | ✅ | The Anthropic model ID being called |
| `attempt` | `number` | ✅ | 1-indexed retry attempt number |
| `durationMs` | `number` | ❌ | Wall-clock time for this attempt (omitted on `attempt_start`) |
| `error` | `string` | ❌ | Error message if the attempt failed |
| `errorClassification` | `string` | ❌ | Structured error category (see below) |

## Event Kinds (`ProviderEventKind`)

| Kind | Log Level | When Emitted | Fields Set |
| --- | --- | --- | --- |
| `attempt_start` | `info` | Before each provider call | `kind`, `surface`, `model`, `attempt` |
| `attempt_success` | `info` | After a successful provider response | All base + `durationMs` |
| `attempt_retry` | `warn` | When a transient error triggers a retry | All base + `durationMs`, `error`, `errorClassification` |
| `attempt_failure` | `error` | When an attempt fails terminally | All base + `durationMs`, `error`, `errorClassification` |
| `model_fallback` | `warn` | When `isModelNotFoundError` triggers fallback to next model | All base + `durationMs`, `error`, `errorClassification` |

## Error Classification Values

| Classification | Meaning | Triggers Retry? |
| --- | --- | --- |
| `transient` | Rate limit, 5xx, network, fetch failure | ✅ Yes (up to `retryAttempts`) |
| `timeout` | Request exceeded `timeoutMs` | ⚠️ Stream: yes (unless after completed round). Direct-turn: no (fail-fast) |
| `model_not_found` | Model ID not available on provider | ❌ No — triggers model fallback |
| `abort` | User-initiated or system cancellation | ❌ No — immediate throw |
| `fatal` | Unrecognized error (auth, bad request, etc.) | ❌ No — immediate throw |

## Log Output Format

Events are emitted through `logEvent()` from `src/lib/observability/logger.ts`
which routes through Pino. The log event name follows the pattern
`provider.{kind}`, e.g. `provider.attempt_start`, `provider.attempt_retry`.

Example structured log output:

```json
{
  "level": "warn",
  "event": "provider.attempt_retry",
  "surface": "stream",
  "model": "claude-sonnet-4-20250514",
  "attempt": 2,
  "durationMs": 12450,
  "error": "Request timed out",
  "errorClassification": "timeout"
}
```

## Source

All event types and the `emitProviderEvent()` function are defined in
`src/lib/chat/provider-policy.ts`.
