import type { ChatResponseState } from "@/core/entities/chat-message";
import type { MessagePart } from "@/core/entities/message-parts";

const SUGGESTIONS_MARKER = "__suggestions__:";
const ACTIONS_MARKER = "__actions__:";
const RESPONSE_STATE_MARKER = "__response_state__:";

const CONCRETE_OUTPUT_TERMS = [
  "draft",
  "plan",
  "roadmap",
  "proposal",
  "spec",
  "architecture",
  "checklist",
  "outline",
  "recommendation",
  "next step",
  "workflow",
  "implementation",
  "assessment",
  "estimate",
] as const;

type ExtractedTag = {
  text: string;
  payload: unknown[];
};

type ExtractedStringTag = {
  text: string;
  payload: string | null;
};

type TrailingArrayTagMatch = ExtractedTag & {
  markerIndex: number;
};

type TrailingStringTagMatch = ExtractedStringTag & {
  markerIndex: number;
};

type TrailingControlTagMatch =
  | { kind: "suggestions"; match: TrailingArrayTagMatch }
  | { kind: "actions"; match: TrailingArrayTagMatch }
  | { kind: "responseState"; match: TrailingStringTagMatch };

type ExtractedControlTags = {
  text: string;
  suggestionsPayload: unknown[];
  actionsPayload: unknown[];
  responseStatePayload: string | null;
};

export type SessionResolutionKind = "advanced" | "resolved" | "blocked";

export interface SessionResolutionSignal {
  kind: SessionResolutionKind;
  reason: "actionable_next_steps" | "tool_output" | "deliverable_language" | "closed_response_state" | "needs_input";
  responseState: ChatResponseState;
}

function findJsonArrayEnd(input: string, arrayStart: number): number {
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = arrayStart; index < input.length; index += 1) {
    const character = input[index];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (character === "\\") {
      escaping = true;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === "[") {
      depth += 1;
      continue;
    }

    if (character === "]") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function findJsonStringEnd(input: string, stringStart: number): number {
  let escaping = false;

  for (let index = stringStart + 1; index < input.length; index += 1) {
    const character = input[index];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (character === "\\") {
      escaping = true;
      continue;
    }

    if (character === '"') {
      return index;
    }
  }

  return -1;
}

function extractTrailingTaggedArray(text: string, marker: string): TrailingArrayTagMatch | null {
  const markerIndex = text.lastIndexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  const arrayStart = markerIndex + marker.length;
  if (text[arrayStart] !== "[") {
    return null;
  }

  const arrayEnd = findJsonArrayEnd(text, arrayStart);
  if (arrayEnd < 0) {
    return {
      markerIndex,
      text: text.slice(0, markerIndex).trimEnd(),
      payload: [],
    };
  }

  if (text.slice(arrayEnd + 1).trim().length > 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(text.slice(arrayStart, arrayEnd + 1));
    return {
      markerIndex,
      text: text.slice(0, markerIndex).trimEnd(),
      payload: Array.isArray(parsed) ? parsed : [],
    };
  } catch {
    return {
      markerIndex,
      text: text.slice(0, markerIndex).trimEnd(),
      payload: [],
    };
  }
}

function extractTrailingTaggedString(text: string, marker: string): TrailingStringTagMatch | null {
  const markerIndex = text.lastIndexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  const stringStart = markerIndex + marker.length;
  if (text[stringStart] !== '"') {
    return null;
  }

  const stringEnd = findJsonStringEnd(text, stringStart);
  if (stringEnd < 0 || text.slice(stringEnd + 1).trim().length > 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(text.slice(stringStart, stringEnd + 1));
    return {
      markerIndex,
      text: text.slice(0, markerIndex).trimEnd(),
      payload: typeof parsed === "string" ? parsed : null,
    };
  } catch {
    return {
      markerIndex,
      text: text.slice(0, markerIndex).trimEnd(),
      payload: null,
    };
  }
}

function extractControlTags(text: string): ExtractedControlTags {
  let remainingText = text.trimEnd();
  let suggestionsPayload: unknown[] = [];
  let actionsPayload: unknown[] = [];
  let responseStatePayload: string | null = null;
  let hasSuggestionsTag = false;
  let hasActionsTag = false;
  let hasResponseStateTag = false;

  while (true) {
    const candidates: TrailingControlTagMatch[] = [];

    if (!hasSuggestionsTag) {
      const match = extractTrailingTaggedArray(remainingText, SUGGESTIONS_MARKER);
      if (match) {
        candidates.push({ kind: "suggestions", match });
      }
    }

    if (!hasActionsTag) {
      const match = extractTrailingTaggedArray(remainingText, ACTIONS_MARKER);
      if (match) {
        candidates.push({ kind: "actions", match });
      }
    }

    if (!hasResponseStateTag) {
      const match = extractTrailingTaggedString(remainingText, RESPONSE_STATE_MARKER);
      if (match) {
        candidates.push({ kind: "responseState", match });
      }
    }

    if (candidates.length === 0) {
      break;
    }

    candidates.sort((left, right) => right.match.markerIndex - left.match.markerIndex);
    const [candidate] = candidates;
    remainingText = candidate.match.text;

    switch (candidate.kind) {
      case "suggestions":
        hasSuggestionsTag = true;
        suggestionsPayload = candidate.match.payload;
        break;
      case "actions":
        hasActionsTag = true;
        actionsPayload = candidate.match.payload;
        break;
      case "responseState":
        hasResponseStateTag = true;
        responseStatePayload = candidate.match.payload;
        break;
    }
  }

  return {
    text: remainingText.trim(),
    suggestionsPayload,
    actionsPayload,
    responseStatePayload,
  };
}

function normalizeResponseState(payload: string | null): ChatResponseState | null {
  if (payload === "open" || payload === "closed" || payload === "needs_input") {
    return payload;
  }

  return null;
}

function normalizeSuggestions(payload: unknown[]): string[] {
  return payload
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry.length <= 60)
    .slice(0, 4);
}

function looksLikeBlockingQuestion(textContent: string): boolean {
  const trimmed = textContent.trim();
  if (!trimmed.endsWith("?")) {
    return false;
  }

  return trimmed.split("?").length - 1 === 1;
}

function deriveResponseState(
  explicitState: ChatResponseState | null,
  suggestions: string[],
  textContent: string,
): ChatResponseState {
  if (explicitState) {
    return explicitState;
  }

  if (suggestions.length > 0) {
    return "open";
  }

  return looksLikeBlockingQuestion(textContent) ? "needs_input" : "closed";
}

function looksLikeConcreteOutput(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (normalized.length < 80) {
    return false;
  }

  return CONCRETE_OUTPUT_TERMS.some((term) => normalized.includes(term));
}

export function resolveSessionResolutionSignal(input: {
  status: "completed" | "stopped" | "interrupted";
  assistantText: string;
  assistantParts: MessagePart[];
}): SessionResolutionSignal | null {
  if (input.status !== "completed") {
    return null;
  }

  const extractedControls = extractControlTags(input.assistantText);
  const responseState = deriveResponseState(
    normalizeResponseState(extractedControls.responseStatePayload),
    normalizeSuggestions(extractedControls.suggestionsPayload),
    extractedControls.text,
  );

  if (responseState === "closed") {
    return {
      kind: "resolved",
      reason: "closed_response_state",
      responseState,
    };
  }

  if (responseState === "needs_input") {
    return {
      kind: "blocked",
      reason: "needs_input",
      responseState,
    };
  }

  if (extractedControls.actionsPayload.length > 0) {
    return {
      kind: "advanced",
      reason: "actionable_next_steps",
      responseState,
    };
  }

  if (input.assistantParts.some((part) => part.type === "tool_result")) {
    return {
      kind: "advanced",
      reason: "tool_output",
      responseState,
    };
  }

  if (looksLikeConcreteOutput(extractedControls.text)) {
    return {
      kind: "advanced",
      reason: "deliverable_language",
      responseState,
    };
  }

  return null;
}