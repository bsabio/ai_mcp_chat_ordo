import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChatInput } from "@/frameworks/ui/ChatInput";
import type { MentionItem } from "@/core/entities/mentions";

globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-url");
globalThis.URL.revokeObjectURL = vi.fn();

const baseSuggestions: MentionItem[] = [
  { id: "p1", name: "Fr. Benedict", category: "practitioner" },
  { id: "p2", name: "Fr. Anselm", category: "practitioner" },
  { id: "p3", name: "Sr. Maria", category: "practitioner" },
];

const defaultProps = {
  value: "",
  onChange: vi.fn(),
  onSend: vi.fn(),
  isSending: false,
  canSend: false,
  activeTrigger: null as string | null,
  suggestions: [] as MentionItem[],
  mentionIndex: 0,
  onMentionIndexChange: vi.fn(),
  onSuggestionSelect: vi.fn(),
  pendingFiles: [] as File[],
  onFileDrop: vi.fn(),
  onFileSelect: vi.fn(),
  onFileRemove: vi.fn(),
};

describe("Accessibility hardening", () => {
  it("CCH-T350: Textarea has aria-label='Message'", () => {
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Ask Studio Ordo...");
    expect(textarea).toHaveAttribute("aria-label", "Message");
  });

  it("CCH-T340: Textarea has enterKeyHint='send'", () => {
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Ask Studio Ordo...");
    expect(textarea).toHaveAttribute("enterKeyHint", "send");
  });

  it("CCH-T351: Live region shows '3 suggestions available' when trigger active", () => {
    render(
      <ChatInput
        {...defaultProps}
        activeTrigger="@"
        suggestions={baseSuggestions}
      />,
    );

    const liveRegion = document.querySelector('[data-chat-mention-live="true"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion!.textContent).toBe("3 suggestions available");
  });

  it("CCH-T353: Live region is empty when no trigger is active", () => {
    render(<ChatInput {...defaultProps} />);

    const liveRegion = document.querySelector('[data-chat-mention-live="true"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion!.textContent).toBe("");
  });

  it("CCH-T355: No aria-activedescendant when no suggestions", () => {
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Ask Studio Ordo...");
    expect(textarea).not.toHaveAttribute("aria-activedescendant");
  });

  it("CCH-T356: Textarea does not have role='combobox' when no trigger", () => {
    render(<ChatInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Ask Studio Ordo...");
    expect(textarea).not.toHaveAttribute("role");
  });

  it("CCH-T352: aria-activedescendant points to active mentionIndex", () => {
    render(
      <ChatInput
        {...defaultProps}
        activeTrigger="@"
        suggestions={baseSuggestions}
        mentionIndex={1}
      />,
    );

    const textarea = screen.getByPlaceholderText("Ask Studio Ordo...");
    expect(textarea).toHaveAttribute("aria-activedescendant", "mention-option-1");
    expect(textarea).toHaveAttribute("role", "combobox");
    expect(textarea).toHaveAttribute("aria-expanded", "true");
    expect(textarea).toHaveAttribute("aria-haspopup", "listbox");
  });

  it("CCH-T360: Live region updates when suggestion count changes", () => {
    const { rerender } = render(
      <ChatInput
        {...defaultProps}
        activeTrigger="@"
        suggestions={baseSuggestions}
      />,
    );

    const liveRegion = document.querySelector('[data-chat-mention-live="true"]')!;
    expect(liveRegion.textContent).toBe("3 suggestions available");

    rerender(
      <ChatInput
        {...defaultProps}
        activeTrigger="@"
        suggestions={baseSuggestions.slice(0, 2)}
      />,
    );

    expect(liveRegion.textContent).toBe("2 suggestions available");
  });

  it("CCH-T362: File pill remove button has aria-label", () => {
    const file = new File(["content"], "report.pdf", { type: "application/pdf" });

    render(
      <ChatInput
        {...defaultProps}
        pendingFiles={[file]}
      />,
    );

    expect(screen.getByRole("button", { name: "Remove report.pdf" })).toBeInTheDocument();
  });
});

describe("File pill thumbnails", () => {
  it("CCH-T320: JPEG file shows an img element", () => {
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });

    render(
      <ChatInput
        {...defaultProps}
        pendingFiles={[file]}
      />,
    );

    const img = document.querySelector(".ui-chat-file-pill img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "blob:mock-url");
  });

  it("CCH-T321: PNG file shows an img element", () => {
    const file = new File(["img"], "screenshot.png", { type: "image/png" });

    render(
      <ChatInput
        {...defaultProps}
        pendingFiles={[file]}
      />,
    );

    expect(document.querySelector(".ui-chat-file-pill img")).not.toBeNull();
  });

  it("CCH-T322: PDF file shows 📄 icon without img", () => {
    const file = new File(["pdf"], "doc.pdf", { type: "application/pdf" });

    render(
      <ChatInput
        {...defaultProps}
        pendingFiles={[file]}
      />,
    );

    expect(document.querySelector(".ui-chat-file-pill img")).toBeNull();
    expect(document.querySelector(".ui-chat-file-pill")!.textContent).toContain("📄");
  });

  it("CCH-T325: text/plain file shows 📝 icon", () => {
    const file = new File(["text"], "notes.txt", { type: "text/plain" });

    render(
      <ChatInput
        {...defaultProps}
        pendingFiles={[file]}
      />,
    );

    expect(document.querySelector(".ui-chat-file-pill img")).toBeNull();
    expect(document.querySelector(".ui-chat-file-pill")!.textContent).toContain("📝");
  });

  it("CCH-T332: 10 files produce 10 pills", () => {
    const files = Array.from({ length: 10 }, (_, i) =>
      new File(["x"], `file-${i}.jpg`, { type: "image/jpeg" }),
    );

    render(
      <ChatInput
        {...defaultProps}
        pendingFiles={files}
      />,
    );

    expect(document.querySelectorAll(".ui-chat-file-pill").length).toBe(10);
  });

  it("CCH-T333: Long filename is truncated with title attribute", () => {
    const longName = "a".repeat(200) + ".jpg";
    const file = new File(["x"], longName, { type: "image/jpeg" });

    render(
      <ChatInput
        {...defaultProps}
        pendingFiles={[file]}
      />,
    );

    const pill = document.querySelector(".ui-chat-file-pill");
    expect(pill).toHaveAttribute("title", longName);
  });

  it("CCH-T341: 1 suggestion uses singular form", () => {
    render(
      <ChatInput
        {...defaultProps}
        activeTrigger="@"
        suggestions={[baseSuggestions[0]]}
      />,
    );

    const liveRegion = document.querySelector('[data-chat-mention-live="true"]')!;
    expect(liveRegion.textContent).toBe("1 suggestion available");
  });
});

describe("Send error visual feedback", () => {
  it("renders error live region when sendError is set", () => {
    render(<ChatInput {...defaultProps} sendError="Network error" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Network error");
  });

  it("sets data-chat-composer-error attribute when sendError is set", () => {
    render(<ChatInput {...defaultProps} sendError="Failed" />);

    const form = document.querySelector('[data-chat-composer-form="true"]');
    expect(form).toHaveAttribute("data-chat-composer-error", "true");
  });

  it("does not render error elements when sendError is null", () => {
    render(<ChatInput {...defaultProps} sendError={null} />);

    expect(screen.queryByRole("alert")).toBeNull();
    const form = document.querySelector('[data-chat-composer-form="true"]');
    expect(form).not.toHaveAttribute("data-chat-composer-error");
  });
});
