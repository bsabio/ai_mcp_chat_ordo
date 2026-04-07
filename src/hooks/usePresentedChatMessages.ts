import { useMemo, useRef } from "react";

import { ChatPresenter, type PresentedMessage } from "@/adapters/ChatPresenter";
import { CommandParserService } from "@/adapters/CommandParserService";
import { MarkdownParserService } from "@/adapters/MarkdownParserService";
import type { ChatMessage } from "@/core/entities/chat-message";

interface PresentedChatMessagesResult {
  presentedMessages: PresentedMessage[];
  dynamicSuggestions: string[];
  scrollDependency: number;
}

export function usePresentedChatMessages(
  messages: ChatMessage[],
): PresentedChatMessagesResult {
  const markdownParser = useMemo(() => new MarkdownParserService(), []);
  const commandParser = useMemo(() => new CommandParserService(), []);
  const presenter = useMemo(
    () => new ChatPresenter(markdownParser, commandParser),
    [commandParser, markdownParser],
  );

  const presentedMessages = useMemo(
    () => presenter.presentMany(messages),
    [messages, presenter],
  );

  const dynamicSuggestions = useMemo(() => {
    const lastMsg = presentedMessages[presentedMessages.length - 1];
    return lastMsg?.role === "assistant" && lastMsg.suggestions
      ? lastMsg.suggestions
      : [];
  }, [presentedMessages]);

  const scrollEpochRef = useRef(0);
  const scrollDependency = useMemo(() => {
    scrollEpochRef.current += 1;
    return scrollEpochRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: counter increments when deps change
  }, [presentedMessages, dynamicSuggestions]);

  return {
    presentedMessages,
    dynamicSuggestions,
    scrollDependency,
  };
}