/** Chat orchestration configuration constants. */
export const CHAT_CONFIG = Object.freeze({
  /** Maximum number of tool-call rounds per orchestration turn. */
  maxToolRounds: 6,
  /** Warn when the active context window reaches this many messages before trimming. */
  warnContextMessages: 32,
  /** Maximum number of messages sent to the LLM in a single context window. */
  maxContextMessages: 40,
  /** Warn when the active context window reaches this many characters before trimming. */
  warnContextCharacters: 64_000,
  /** Maximum total character length of the context window before trimming. */
  maxContextCharacters: 80_000,
});
