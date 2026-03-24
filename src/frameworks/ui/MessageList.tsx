import Image from "next/image";

import React from "react";
import type { PresentedMessage } from "../../adapters/ChatPresenter";
import type { MessageAction } from "../../adapters/ChatPresenter";
import { RichContentRenderer } from "./RichContentRenderer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { ActionLinkType, BlockNode, InlineNode, RichContent } from "@/core/entities/rich-content";
import { useInstanceIdentity, useInstancePrompts } from "@/lib/config/InstanceConfigContext";
import { DEFAULT_IDENTITY, DEFAULT_PROMPTS } from "@/lib/config/defaults";

interface MessageListProps {
  messages: PresentedMessage[];
  isSending: boolean;
  dynamicSuggestions: string[];
  isHeroState?: boolean;
  isSuggestionDisabled?: boolean;
  onSuggestionClick: (text: string) => void;
  onLinkClick: (slug: string) => void;
  onActionClick?: (actionType: ActionLinkType, value: string, params?: Record<string, string>) => void;
  searchQuery: string;
  isEmbedded?: boolean;
}

const BrandHeader = ({ isEmbedded = false, serviceChips, heroHeading, heroSubheading }: { isEmbedded?: boolean; serviceChips: readonly string[]; heroHeading: string; heroSubheading: string }) => (
  <div
    className={`mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-3 text-center animate-in fade-in slide-in-from-top-4 duration-700 ease-out fill-mode-both sm:px-4 ${isEmbedded ? "pb-(--hero-intro-stack-gap) space-y-(--hero-intro-stack-gap)" : "pt-(--phi-1) pb-(--hero-intro-stack-gap) space-y-(--hero-intro-stack-gap)"}`}
    data-homepage-chat-intro="true"
  >
    <div className="flex flex-wrap items-center justify-center gap-x-(--hero-badge-gap) gap-y-(--phi-2) rounded-full border border-foreground/7 bg-background/66 px-(--hero-badge-padding-inline) py-(--hero-badge-padding-block) text-[0.66rem] font-medium uppercase tracking-[0.18em] text-foreground/42 shadow-[0_10px_30px_-26px_color-mix(in_srgb,var(--shadow-base)_12%,transparent)] backdrop-blur-sm">
      {serviceChips.map((chip, index) => (
        <React.Fragment key={chip}>
          {index > 0 ? (
            <span aria-hidden="true" className="hidden text-foreground/20 sm:inline">
              /
            </span>
          ) : null}
          <span data-homepage-service-chip="true">{chip}</span>
        </React.Fragment>
      ))}
    </div>

    <h2
      className="theme-body text-foreground balance font-semibold"
      style={{
        maxWidth: "var(--hero-title-max-width)",
        fontSize: "var(--hero-title-font-size)",
        lineHeight: "var(--hero-title-line-height)",
        letterSpacing: "var(--tier-display-tracking)",
      }}
    >
      {heroHeading}
    </h2>

    <p
      className="theme-body text-foreground/56"
      style={{
        maxWidth: "var(--hero-greeting-max-width)",
        fontSize: "var(--hero-body-font-size)",
        lineHeight: "var(--hero-body-line-height)",
      }}
    >
      {heroSubheading}
    </p>
  </div>
);

function extractInlineText(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
        case "bold":
        case "code-inline":
          return node.text;
        case "library-link":
          return node.slug.replace(/-/g, " ");
        case "action-link":
          return node.label;
        default:
          return "";
      }
    })
    .join(" ");
}

function extractBlockText(block: BlockNode): string {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "blockquote":
      return extractInlineText(block.content);
    case "list":
      return block.items.map((item) => extractInlineText(item)).join(" ");
    case "table":
      return [
        ...(block.header ?? []).map((cell) => extractInlineText(cell)),
        ...block.rows.flat().map((cell) => extractInlineText(cell)),
      ].join(" ");
    case "audio":
      return `${block.title} ${block.text}`;
    case "web-search":
      return `${block.query} ${(block.allowed_domains ?? []).join(" ")}`;
    case "operator-brief":
      return block.sections
        .map((section) => `${section.label} ${extractInlineText(section.summary)} ${(section.items ?? []).map((item) => extractInlineText(item)).join(" ")}`)
        .join(" ");
    case "code-block":
      return block.code;
    case "divider":
      return "";
    default:
      return "";
  }
}

function extractRichContentText(content: RichContent): string {
  return content.blocks.map((block) => extractBlockText(block)).join(" ").trim();
}

const searchableMessageTextCache = new WeakMap<PresentedMessage, string>();

function getSearchableMessageText(message: PresentedMessage): string {
  const cached = searchableMessageTextCache.get(message);
  if (cached) {
    return cached;
  }

  const searchableText = `${message.rawContent} ${extractRichContentText(message.content)}`.toLowerCase();
  searchableMessageTextCache.set(message, searchableText);
  return searchableText;
}

function getLastAssistantMessageId(messages: PresentedMessage[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "assistant") {
      return messages[index]?.id;
    }
  }

  return undefined;
}

export const MessageList: React.FC<MessageListProps> = React.memo(({
  messages,
  isSending,
  dynamicSuggestions,
  isHeroState = false,
  isSuggestionDisabled = false,
  onSuggestionClick,
  onLinkClick,
  onActionClick,
  searchQuery,
  isEmbedded = false,
}) => {
  const identity = useInstanceIdentity();
  const instancePrompts = useInstancePrompts();
  const serviceChips = identity.serviceChips ?? DEFAULT_IDENTITY.serviceChips ?? [];
  const heroHeading = instancePrompts.heroHeading ?? DEFAULT_PROMPTS.heroHeading ?? "";
  const heroSubheading = instancePrompts.heroSubheading ?? DEFAULT_PROMPTS.heroSubheading ?? "";
  const normalizedQuery = React.useMemo(
    () => searchQuery.trim().toLowerCase(),
    [searchQuery],
  );
  const filteredMessages = React.useMemo(() => {
    if (!normalizedQuery) {
      return messages;
    }

    return messages.filter((message) =>
      getSearchableMessageText(message).includes(normalizedQuery),
    );
  }, [messages, normalizedQuery]);
  const hideHeroTranscript = React.useMemo(
    () =>
      isHeroState &&
      !searchQuery &&
      filteredMessages.length === 1 &&
      filteredMessages[0]?.role === "assistant",
    [filteredMessages, isHeroState, searchQuery],
  );
  const renderedMessages = React.useMemo(
    () => (hideHeroTranscript ? [] : filteredMessages),
    [filteredMessages, hideHeroTranscript],
  );

  const firstMessageId = messages[0]?.id;
  const lastMessageId = messages[messages.length - 1]?.id;
  const lastVisibleMessageId = renderedMessages[renderedMessages.length - 1]?.id;
  const lastAssistantMessageId = React.useMemo(
    () => getLastAssistantMessageId(messages),
    [messages],
  );
  const hasVisibleSuggestionChips = React.useMemo(
    () =>
      !isSending &&
      dynamicSuggestions.length > 0 &&
      lastAssistantMessageId != null &&
      lastAssistantMessageId === lastVisibleMessageId,
    [dynamicSuggestions.length, isSending, lastAssistantMessageId, lastVisibleMessageId],
  );

  if (filteredMessages.length === 0 && searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
        <p className="text-sm font-medium">
          No messages found matching &ldquo;{searchQuery}&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex w-full max-w-176 flex-col"
      data-message-list-mode={isEmbedded ? "embedded" : "floating"}
      data-message-list-state={isHeroState ? "hero" : "conversation"}
      data-chat-fold-buffer={isEmbedded ? "true" : undefined}
      style={{
        gap: "var(--message-gap)",
        paddingTop: isHeroState ? "clamp(0.5rem, 2.5vh, 1rem)" : undefined,
        paddingBottom: isEmbedded
          ? isHeroState
            ? "var(--hero-composer-offset)"
            : `calc(var(--chat-fold-gutter) + var(--chat-composer-gap) + ${hasVisibleSuggestionChips ? "var(--chat-suggestion-stack-clearance)" : "0px"})`
          : "2rem",
      }}
    >
      {isHeroState && !searchQuery && <BrandHeader isEmbedded={isEmbedded} serviceChips={serviceChips} heroHeading={heroHeading} heroSubheading={heroSubheading} />}

      {renderedMessages.map((message) => (
        <div key={message.id} className="flex flex-col gap-(--phi-1) animate-in fade-in slide-in-from-bottom-3 duration-700 ease-out fill-mode-both">
          {message.role === "user" ? (
            <UserBubble content={message} />
          ) : (
            <AssistantBubble
              message={message}
              isStreaming={isSending && message.id === lastMessageId}
              onLinkClick={onLinkClick}
              onActionClick={onActionClick}
              isInitialGreeting={message.id === firstMessageId}
              isAnchor={message.id === lastAssistantMessageId && !isHeroState}
              brandName={identity.name}
              brandLogoPath={identity.logoPath}
            />
          )}

          {message.role === "assistant" &&
            !isSending &&
            message.id === lastAssistantMessageId &&
            message.id === lastVisibleMessageId &&
            dynamicSuggestions.length > 0 && (
              <div className={`${isHeroState ? "mt-(--phi-1) flex justify-center pb-(--phi-2)" : "mt-(--phi-1) max-w-[min(44rem,calc(100%-var(--phi-2p)))] pb-(--phi-1)"} animate-in fade-in slide-in-from-bottom-2 duration-500`} style={isHeroState ? undefined : { marginInlineStart: 'var(--chat-message-inline-offset)' }}>
                <SuggestionChips
                  suggestions={dynamicSuggestions}
                  onSend={onSuggestionClick}
                  disabled={isSuggestionDisabled}
                  centered={isHeroState}
                />
              </div>
            )}
        </div>
      ))}

      {hideHeroTranscript && dynamicSuggestions.length > 0 && (
        <div className="mt-(--phi-1) flex justify-center pb-(--phi-2) animate-in fade-in slide-in-from-bottom-2 duration-500">
          <SuggestionChips
            suggestions={dynamicSuggestions}
            onSend={onSuggestionClick}
            disabled={isSuggestionDisabled}
            centered
            label={undefined}
          />
        </div>
      )}

      {isSending && !hideHeroTranscript && lastVisibleMessageId === lastMessageId && messages[messages.length - 1]?.role === "user" && (
        <TypingIndicator />
      )}
    </div>
  );
});

MessageList.displayName = "MessageList";

const UserBubble = React.memo<{ content: PresentedMessage }>(({ content }) => {
  return (
    <div className="flex w-full flex-col items-end gap-(--chat-meta-gap) px-1 sm:px-2 md:px-0" data-chat-message-role="user" data-chat-message-emphasis="supporting">
      <div className="theme-label tier-micro pe-(--chat-bubble-padding-inline) font-medium text-foreground/28" data-chat-message-meta="true">
        <span>You</span>
        {content.timestamp ? <span className="ms-(--phi-2) tabular-nums text-foreground/22">{content.timestamp}</span> : null}
      </div>
      <div className="relative theme-body tier-body max-w-[92%] rounded-[calc(var(--chat-suggestion-frame-radius)-var(--phi-2))] rounded-br-[calc(var(--phi-1p)+var(--phi-2))] rounded-tr-[calc(var(--phi-1p)+var(--phi-3))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_7%,var(--surface))_0%,color-mix(in_oklab,var(--accent)_4%,var(--surface))_100%)] px-(--chat-bubble-padding-inline) py-(--chat-bubble-padding-block) text-foreground shadow-[0_12px_24px_-24px_color-mix(in_srgb,var(--shadow-base)_9%,transparent)] sm:max-w-[74%]" data-chat-bubble-surface="true">
        <ErrorBoundary name="UserBubble">
          <RichContentRenderer content={content.content} />
          {content.attachments.length > 0 && (
            <div className={`${content.rawContent ? "mt-3" : ""} flex flex-col gap-2`}>
              {content.attachments.map((attachment) => (
                <a
                  key={attachment.assetId}
                  href={`/api/user-files/${attachment.assetId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-2xl border border-accent/12 bg-background/70 px-3 py-2.5 text-left transition-colors hover:bg-background"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
                      Attachment
                    </span>
                    <span className="block truncate text-sm font-medium normal-case tracking-normal text-foreground">
                      {attachment.fileName}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-foreground/55">
                    {Math.max(1, Math.round(attachment.fileSize / 1024))} KB
                  </span>
                </a>
              ))}
            </div>
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
});

UserBubble.displayName = "UserBubble";

const AssistantBubble = React.memo<{
  message: PresentedMessage;
  isStreaming: boolean;
  onLinkClick: (slug: string) => void;
  onActionClick?: (actionType: ActionLinkType, value: string, params?: Record<string, string>) => void;
  isInitialGreeting?: boolean;
  isAnchor?: boolean;
  brandName: string;
  brandLogoPath: string;
}>(({ message, isStreaming, onLinkClick, onActionClick, isInitialGreeting, isAnchor = false, brandName, brandLogoPath }) => {
  const [displayText, setDisplayText] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(!!isInitialGreeting);
  
  React.useEffect(() => {
    if (!isInitialGreeting) return;
    let current = "";
    let index = 0;
    const speed = 10;
    const fullText = message.rawContent || "";

    const interval = setInterval(() => {
      if (index < fullText.length) {
        current += fullText[index];
        setDisplayText(current);
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [message.rawContent, isInitialGreeting]);

  return (
    <div className="group flex w-full items-start justify-start gap-(--phi-1) px-1 transition-all duration-300 sm:gap-(--phi-1p) sm:px-2 md:px-0" data-chat-message-role="assistant" data-chat-message-emphasis={isAnchor ? "anchor" : "supporting"}>
      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-[0_8px_20px_-20px_color-mix(in_srgb,var(--shadow-base)_8%,transparent)]">
        <Image src={brandLogoPath} alt="" width={24} height={24} className="object-cover" style={{ width: "100%", height: "100%" }} />
      </div>

      <div className={`flex w-full max-w-[95%] flex-col gap-(--chat-meta-gap) sm:max-w-[86%] ${isInitialGreeting ? "pt-1" : ""}`}>
        <div className="flex items-center gap-(--phi-2) ps-(--phi-2)" data-chat-message-meta="true">
          <span className="theme-label tier-micro font-medium text-foreground/30">
            {brandName}
          </span>
          {message.timestamp ? (
            <span className="theme-label tier-micro font-medium tabular-nums text-foreground/18">
              {message.timestamp}
            </span>
          ) : null}
        </div>
        <div className="theme-body tier-body relative overflow-hidden rounded-[calc(var(--chat-suggestion-frame-radius)-var(--phi-2))] rounded-bl-[calc(var(--phi-1p)+var(--phi-2))] rounded-tl-[calc(var(--phi-1p)+var(--phi-3))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface)_99%,var(--background))_0%,color-mix(in_oklab,var(--surface)_96%,var(--background))_100%)] px-(--chat-bubble-padding-inline) py-[calc(var(--chat-bubble-padding-block)+var(--phi-2))] text-foreground/80 shadow-[0_14px_28px_-26px_color-mix(in_srgb,var(--shadow-base)_8%,transparent)]" data-chat-bubble-surface="true">
          <div className="pointer-events-none absolute inset-y-[calc(var(--chat-bubble-padding-block)+var(--phi-3))] left-(--chat-bubble-padding-inline) w-px rounded-full bg-linear-to-b from-transparent via-foreground/6 to-transparent" aria-hidden="true" />
          <ErrorBoundary name="AssistantBubble">
            {isInitialGreeting ? (
              <div className="relative ps-(--phi-1)">
                <div className="invisible pointer-events-none" aria-hidden="true">
                  <RichContentRenderer content={message.content} />
                </div>
                <div className="absolute inset-x-0 top-0">
                  {isTyping ? (
                    <div className="inline whitespace-pre-wrap">
                      {displayText}
                      <span className="inline-block w-1.5 h-4 ms-1 bg-accent animate-pulse align-middle" />
                    </div>
                  ) : (
                    <div className="animate-in fade-in duration-500">
                      <RichContentRenderer content={message.content} onLinkClick={onLinkClick} onActionClick={onActionClick} />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="ps-(--phi-1)">
                <RichContentRenderer
                  content={message.content}
                  onLinkClick={onLinkClick}
                  onActionClick={onActionClick}
                />
              </div>
            )}
          </ErrorBoundary>

          {message.actions.length > 0 && (
            <div className="mt-3 border-t border-border/40 pt-3">
              <MessageActionChips
                actions={message.actions}
                onActionClick={onActionClick}
                disabled={isStreaming}
              />
            </div>
          )}

          {isStreaming && !isInitialGreeting && (
            <span className="inline-block w-1 h-3.5 bg-accent animate-pulse align-middle ms-1 rounded-sm relative -top-0.5" />
          )}
        </div>
      </div>
    </div>
  );
});

AssistantBubble.displayName = "AssistantBubble";

const ACTION_VALUE_KEY: Record<string, string> = {
  conversation: "id",
  route: "path",
  send: "text",
  corpus: "slug",
};

const MessageActionChips: React.FC<{
  actions: MessageAction[];
  onActionClick?: (actionType: ActionLinkType, value: string, params?: Record<string, string>) => void;
  disabled?: boolean;
}> = ({ actions, onActionClick, disabled = false }) => {
  const displayed = actions.slice(0, 3);
  return (
    <div role="group" aria-label="Message actions" className="flex flex-wrap gap-2" data-chat-action-chips="true">
      {displayed.map((action, i) => {
        const primaryValue = action.params[ACTION_VALUE_KEY[action.action] ?? ""] ?? "";
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onActionClick?.(action.action, primaryValue, action.params)}
            className={`inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/8 px-3.5 py-1.5 text-[0.8rem] font-semibold text-accent transition-colors focus-ring ${disabled ? "cursor-wait opacity-55" : "hover:bg-accent/14 hover:border-accent/30 active:scale-[0.98]"}`}
            data-chat-action-chip={action.action}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
};

const TypingIndicator = () => (
  <div className="mt-(--phi-1) flex items-center justify-start gap-2.5 ms-[calc(var(--chat-avatar-size)+var(--phi-1p))]">
    <div className="flex items-center gap-1.5 px-(--phi-1) py-(--phi-2)">
      <span className="w-1.5 h-1.5 rounded-full bg-accent opacity-60 animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-accent opacity-60 animate-bounce [animation-delay:120ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-accent opacity-60 animate-bounce [animation-delay:240ms]" />
    </div>
  </div>
);

const SuggestionChips: React.FC<{
  suggestions: string[];
  onSend: (text: string) => void;
  disabled?: boolean;
  centered?: boolean;
  label?: string;
}> = ({ suggestions, onSend, disabled = false, centered = false, label }) => (
  <div className={`flex flex-col ${centered ? "gap-(--hero-suggestion-stack-gap) items-center" : "gap-(--phi-1) items-start"}`}>
    {label ? (
      <p className={`theme-label tier-micro font-medium text-foreground/20 ${centered ? "text-center" : "ps-(--phi-1)"}`}>
        {label}
      </p>
    ) : null}
    <div
      className={centered
        ? "w-full rounded-(--hero-suggestion-frame-radius) border border-foreground/6 bg-background/56 shadow-[0_18px_50px_-38px_color-mix(in_srgb,var(--shadow-base)_18%,transparent)] backdrop-blur-[10px] max-w-(--hero-suggestion-max-width)"
        : "w-full max-w-[min(38rem,100%)] rounded-[1.45rem] border border-foreground/7 bg-[color-mix(in_oklab,var(--surface)_94%,var(--background))] shadow-[0_14px_28px_-24px_color-mix(in_srgb,var(--shadow-base)_18%,transparent)]"
      }
      style={centered
        ? { paddingInline: 'var(--hero-suggestion-frame-padding-inline)', paddingBlock: 'var(--hero-suggestion-frame-padding-block)' }
        : { paddingInline: 'var(--chat-followup-frame-padding-inline)', paddingBlock: 'var(--chat-followup-frame-padding-block)' }}
      data-chat-suggestion-group={centered ? "hero" : "followup"}
      data-chat-suggestion-priority={centered ? "balanced" : "promoted"}
    >
      <div className={`flex flex-wrap ${centered ? "gap-x-(--hero-chip-cluster-gap) gap-y-(--hero-suggestion-row-gap) justify-center" : "gap-x-(--phi-1) gap-y-(--phi-1) justify-start"}`}>
      {suggestions.map((s, i) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onSend(s)}
          style={{ animationDelay: `${i * 100}ms` }}
          data-chat-suggestion-rank={centered ? "neutral" : i === 0 ? "primary" : "secondary"}
          className={centered
            ? `group theme-body relative inline-flex min-h-(--hero-suggestion-chip-height) items-center justify-center gap-(--phi-2) rounded-full border border-foreground/6 bg-background/82 px-(--hero-suggestion-chip-padding-inline) py-(--hero-suggestion-chip-padding-block) text-[0.95rem] font-medium tracking-[-0.018em] text-foreground/62 shadow-[0_10px_24px_-22px_color-mix(in_srgb,var(--shadow-base)_20%,transparent)] transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 fill-mode-both focus-ring ${disabled ? "cursor-wait opacity-55" : "hover:border-foreground/10 hover:bg-background hover:text-foreground active:scale-[0.995]"}`
            : `group theme-body relative inline-flex min-h-(--chat-followup-chip-height) items-center justify-center gap-(--phi-2) rounded-full border border-foreground/8 bg-background px-(--chat-followup-chip-padding-inline) py-(--chat-followup-chip-padding-block) text-[0.82rem] font-semibold tracking-[-0.012em] text-foreground/66 shadow-[0_10px_18px_-18px_color-mix(in_srgb,var(--shadow-base)_22%,transparent)] transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 fill-mode-both focus-ring ${disabled ? "cursor-wait opacity-55" : "hover:border-foreground/14 hover:text-foreground hover:shadow-[0_14px_24px_-18px_color-mix(in_srgb,var(--shadow-base)_28%,transparent)] active:scale-[0.99]"}`}
        >
          <span className="relative">{s}</span>
        </button>
      ))}
      </div>
    </div>
  </div>
);
