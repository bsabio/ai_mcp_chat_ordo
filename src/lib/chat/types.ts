export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ToolChoice = { type: "auto" } | { type: "tool"; name: "calculator" };
