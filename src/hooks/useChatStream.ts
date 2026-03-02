import { useMemo, useState } from "react";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  async function sendMessage(event?: { preventDefault: () => void }) {
    event?.preventDefault();
    if (!canSend) {
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const nextMessages = [...messages, userMessage];
    const assistantIndex = nextMessages.length;

    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Chat request failed.");
      }

      if (!response.body) {
        throw new Error("No response stream returned.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) {
          continue;
        }

        setMessages((current) => {
          const updated = [...current];
          const currentAssistant = updated[assistantIndex];

          if (!currentAssistant || currentAssistant.role !== "assistant") {
            return current;
          }

          updated[assistantIndex] = {
            role: "assistant",
            content: currentAssistant.content + chunk,
          };

          return updated;
        });
      }

      setMessages((current) => {
        const updated = [...current];
        const currentAssistant = updated[assistantIndex];

        if (currentAssistant && currentAssistant.role === "assistant" && !currentAssistant.content.trim()) {
          updated[assistantIndex] = { role: "assistant", content: "No reply returned." };
        }

        return updated;
      });
    } catch (error) {
      setMessages((current) => [
        ...current.slice(0, assistantIndex),
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "Unexpected chat error.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return {
    messages,
    input,
    isSending,
    canSend,
    setInput,
    sendMessage,
  };
}
