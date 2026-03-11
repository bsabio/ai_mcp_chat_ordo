"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { useGlobalChat } from "@/hooks/useGlobalChat";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useTheme } from "@/components/ThemeProvider";
import { useMentions } from "@/hooks/useMentions";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ChatPresenter } from "../../adapters/ChatPresenter";
import { MarkdownParserService } from "../../adapters/MarkdownParserService";
import { CommandParserService } from "../../adapters/CommandParserService";
import { useUICommands } from "@/hooks/useUICommands";
import { commandRegistry } from "../../core/commands/CommandRegistry";
import { NavigationCommand } from "../../core/commands/NavigationCommands";
import { ThemeCommand } from "../../core/commands/ThemeCommands";
import { 
  SearchBooksCommand, 
  GetChapterCommand, 
  GetChecklistCommand, 
  ListPractitionersCommand,
  GetBookSummaryCommand
} from "../../core/use-cases/tools/BookTools";
import { useRouter } from "next/navigation";

interface Props {
  isFloating?: boolean;
  onClose?: () => void;
}

export const ChatContainer: React.FC<Props> = ({
  isFloating = false,
  onClose,
}) => {
  const { messages, input, isSending, canSend, setInput, sendMessage } =
    useGlobalChat();
  const {
    accessibility,
    setAccessibility,
    gridEnabled,
    setGridEnabled,
    setTheme,
  } = useTheme();
  const router = useRouter();

  const markdownParser = useMemo(() => new MarkdownParserService(), []);
  const commandParser = useMemo(() => new CommandParserService(), []);
  const presenter = useMemo(
    () => new ChatPresenter(markdownParser, commandParser),
    [markdownParser, commandParser],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  // Register Commands
  useMemo(() => {
    // Navigation
    commandRegistry.register(new NavigationCommand("library", "Go to Library", "Navigation", router, "/books"));
    commandRegistry.register(new NavigationCommand("training", "Go to Training", "Navigation", router, "/training"));
    commandRegistry.register(new NavigationCommand("studio", "Go to Studio", "Navigation", router, "/studio"));
    
    // Themes
    commandRegistry.register(new ThemeCommand("theme-fluid", "Set Theme: Fluid", "Themes", setTheme, "fluid"));
    commandRegistry.register(new ThemeCommand("theme-swiss", "Set Theme: Swiss Grid", "Themes", setTheme, "swiss"));
    commandRegistry.register(new ThemeCommand("theme-bauhaus", "Set Theme: Bauhaus", "Themes", setTheme, "bauhaus"));
    commandRegistry.register(new ThemeCommand("theme-postmodern", "Set Theme: Postmodern", "Themes", setTheme, "postmodern"));
    commandRegistry.register(new ThemeCommand("theme-skeuomorphic", "Set Theme: Skeuomorphic", "Themes", setTheme, "skeuomorphic"));

    // Tools
    commandRegistry.register({ id: "search", title: "Search Library", category: "Tools", execute: () => console.log("Trigger search via input") } as any);
    commandRegistry.register({ id: "checklists", title: "Get Checklists", category: "Tools", execute: () => console.log("Trigger checklists") } as any);
    commandRegistry.register({ id: "practitioners", title: "List Practitioners", category: "Tools", execute: () => console.log("Trigger practitioners") } as any);
  }, [router, setTheme]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    activeTrigger,
    suggestions: mentionSuggestions,
    handleInput: handleMentionInput,
    insertMention,
  } = useMentions(textareaRef);

  // Present messages for the UI
  const presentedMessages = useMemo(() => {
    return messages.map((m, index) =>
      presenter.present({
        id: String(index),
        role: m.role,
        content: m.content,
        timestamp: m.timestamp || new Date(),
        parts: m.parts,
      }),
    );
  }, [messages, presenter]);

  const dynamicSuggestions = useMemo(() => {
    const lastMsg = presentedMessages[presentedMessages.length - 1];
    return lastMsg?.role === "assistant" && lastMsg.suggestions
      ? lastMsg.suggestions
      : [];
  }, [presentedMessages]);

  useUICommands(presentedMessages);

  const { scrollRef, isAtBottom, scrollToBottom, handleScroll } =
    useChatScroll(presentedMessages);

  // Handle Input Change
  const handleInputChange = useCallback((val: string, selectionStart: number) => {
    setInput(val);
    handleMentionInput(val, selectionStart);
    setMentionIndex(0);
  }, [setInput, handleMentionInput]);

  const handleSuggestionClick = useCallback(async (txt: string) => {
    await sendMessage(txt);
  }, [sendMessage]);

  const handleLinkClick = useCallback((slug: string) => {
    console.log("Link clicked", slug);
  }, []);

  // Handle Send
  const handleSend = async () => {
    if (!canSend) return;
    await sendMessage();
  };

  if (isFloating && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 end-6 z-[60] w-16 h-16 rounded-full bg-[var(--accent-color)] text-[var(--accent-foreground)] shadow-[-20px_20px_60px_rgba(0,0,0,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group overflow-hidden"
        aria-label="Ask PD Advisor"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    );
  }

  const containerClasses = isFloating
    ? `fixed z-[60] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-[-40px_40px_80px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden backdrop-blur-3xl bg-[var(--background)]/95 border border-[var(--border-color)]
       ${isFullScreen 
         ? "top-0 start-0 w-full h-full rounded-none" 
         : "bottom-6 end-6 w-[calc(100vw-3rem)] md:w-[480px] h-[calc(100dvh-6rem)] md:h-[calc(100dvh-10rem)] max-h-[820px] rounded-[32px]"}`
    : "flex flex-1 flex-col relative bg-[var(--background)] min-h-0 overflow-hidden";
  
  const sectionStyle = {
    viewTransitionName: "chat-container"
  } as React.CSSProperties;

  return (
    <section className={containerClasses} style={sectionStyle}>
      {isFloating && (
        <ChatHeader
          title="PD Advisor"
          subtitle="Intelligent Orchestrator"
          isFloating={isFloating}
          onMinimize={() => {
              setIsOpen(false);
              setIsFullScreen(false);
          }}
          onFullScreenToggle={() => setIsFullScreen(!isFullScreen)}
          isFullScreen={isFullScreen}
          searchQuery={sessionSearchQuery}
          onSearchChange={setSessionSearchQuery}
          density={accessibility.density}
          onDensityChange={(d) =>
            setAccessibility({ ...accessibility, density: d })
          }
          gridEnabled={gridEnabled}
          onGridToggle={() => setGridEnabled(!gridEnabled)}
        />
      )}

      <div className="relative flex-1 min-h-0 flex flex-col w-full overflow-hidden">
        {/* Nuanced Background Branding */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-[0.03] dark:opacity-[0.02]">
          <div className="text-[15rem] sm:text-[22rem] lg:text-[30rem] font-bold leading-none select-none tracking-tighter">O</div>
        </div>
        
        {/* SCROLL AREA: Flex-basis based scroll power */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className={`flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 overscroll-contain z-10 min-h-0 ${!isFloating ? "pt-2" : ""}`}
        >
          <div className={isFullScreen ? "max-w-4xl mx-auto w-full" : "w-full"}>
            <MessageList
              messages={presentedMessages}
              isSending={isSending}
              dynamicSuggestions={dynamicSuggestions}
              onSuggestionClick={handleSuggestionClick}
              onLinkClick={handleLinkClick}
              searchQuery={sessionSearchQuery}
            />
          </div>
        </div>
        {!isAtBottom && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none z-10">
            <button
              onClick={() => scrollToBottom()}
              className="pointer-events-auto bg-[var(--accent-color)] text-[var(--accent-foreground)] px-4 py-2 rounded-full text-[11px] font-bold shadow-xl hover:scale-105 transition-all outline-none"
              aria-label="Scroll to bottom"
            >
              ↓ Scroll to bottom
            </button>
          </div>
        )}
      </div>

      <div className="flex-none bg-[var(--background)] px-3 sm:px-6 pt-3 pb-4 sm:pb-5 border-t border-[var(--border-color)]">
        <div className={isFullScreen ? "max-w-4xl mx-auto w-full" : "w-full"}>
          <ChatInput
            value={input}
            onChange={handleInputChange}
            onSend={handleSend}
            isSending={isSending}
            canSend={canSend}
            onArrowUp={() => {}}
            activeTrigger={activeTrigger ? activeTrigger.char : null}
            suggestions={mentionSuggestions}
            mentionIndex={mentionIndex}
            onMentionIndexChange={setMentionIndex}
            onSuggestionSelect={(item) => {
              if (activeTrigger?.char === "/") {
                const cmd = commandRegistry.getCommand(item.id);
                if (cmd) {
                  cmd.execute();
                  setInput("");
                  return;
                }
              }
              const newText = insertMention(item);
              setInput(newText);
            }}
            pendingFiles={[]}
            onFileSelect={() => {}}
            onFileRemove={() => {}}
          />
        </div>
      </div>
    </section>
  );
};
