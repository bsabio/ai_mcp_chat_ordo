import { describe, it, expect, vi } from "vitest";
import { ChatPresenter } from "./ChatPresenter";
import type { ChatMessage } from "../core/entities/chat-message";
import type { MarkdownParserService } from "./MarkdownParserService";
import type { CommandParserService } from "./CommandParserService";

describe("ChatPresenter", () => {
  const mockMarkdownParser = {
    parse: vi.fn().mockReturnValue({ blocks: [] }),
  } as unknown as MarkdownParserService;

  const mockCommandParser = {
    parse: vi.fn().mockReturnValue([]),
  } as unknown as CommandParserService;

  it("should transform a ChatMessage into a PresentedMessage", () => {
    const presenter = new ChatPresenter(mockMarkdownParser, mockCommandParser);
    const message: ChatMessage = {
      id: "msg-1",
      role: "assistant",
      content: "Hello __ui_command__:set_theme:bauhaus",
      timestamp: new Date("2023-01-01T12:00:00Z"),
    };

    const presented = presenter.present(message);

    expect(presented.id).toBe("msg-1");
    expect(presented.role).toBe("assistant");
    expect(mockMarkdownParser.parse).toHaveBeenCalledWith(message.content);
    expect(mockCommandParser.parse).toHaveBeenCalledWith(message.content);
    expect(presented.timestamp).toBeDefined();
  });

  it("should extract actions from __actions__ tag", () => {
    const presenter = new ChatPresenter(mockMarkdownParser, mockCommandParser);
    const message: ChatMessage = {
      id: "msg-2",
      role: "assistant",
      content: 'Here is help __actions__:[{"label":"View","action":"route","params":{"path":"/help"}}]',
      timestamp: new Date("2023-01-01T12:00:00Z"),
    };

    const presented = presenter.present(message);
    expect(presented.actions).toHaveLength(1);
    expect(presented.actions[0]).toMatchObject({
      label: "View",
      action: "route",
      params: { path: "/help" },
    });
  });

  it("should remove __actions__ tag from text passed to markdown parser", () => {
    const freshParser = {
      parse: vi.fn().mockReturnValue({ blocks: [] }),
    } as unknown as MarkdownParserService;
    const presenter = new ChatPresenter(freshParser, mockCommandParser);
    const message: ChatMessage = {
      id: "msg-3",
      role: "assistant",
      content: 'Hello __actions__:[{"label":"Go","action":"send","params":{"text":"hi"}}]',
      timestamp: new Date("2023-01-01T12:00:00Z"),
    };

    presenter.present(message);
    expect(freshParser.parse).toHaveBeenCalledWith("Hello");
  });

  it("should handle both __actions__ and __suggestions__ tags", () => {
    const presenter = new ChatPresenter(mockMarkdownParser, mockCommandParser);
    const message: ChatMessage = {
      id: "msg-4",
      role: "assistant",
      content:
        'Content __suggestions__:["tip1","tip2"] __actions__:[{"label":"Go","action":"corpus","params":{"slug":"lean"}}]',
      timestamp: new Date("2023-01-01T12:00:00Z"),
    };

    const presented = presenter.present(message);
    expect(presented.suggestions).toEqual(["tip1", "tip2"]);
    expect(presented.actions).toHaveLength(1);
    expect(presented.actions[0].action).toBe("corpus");
  });

  it("should produce empty actions array for malformed JSON", () => {
    const presenter = new ChatPresenter(mockMarkdownParser, mockCommandParser);
    const message: ChatMessage = {
      id: "msg-5",
      role: "assistant",
      content: "Text __actions__:[not valid json]",
      timestamp: new Date("2023-01-01T12:00:00Z"),
    };

    const presented = presenter.present(message);
    expect(presented.actions).toEqual([]);
  });

  it("should filter out unknown action types", () => {
    const presenter = new ChatPresenter(mockMarkdownParser, mockCommandParser);
    const message: ChatMessage = {
      id: "msg-6",
      role: "assistant",
      content:
        'Text __actions__:[{"label":"Ok","action":"route","params":{}},{"label":"Bad","action":"unknown","params":{}}]',
      timestamp: new Date("2023-01-01T12:00:00Z"),
    };

    const presented = presenter.present(message);
    expect(presented.actions).toHaveLength(1);
    expect(presented.actions[0].label).toBe("Ok");
  });

  it("should produce empty actions when no __actions__ tag present", () => {
    const presenter = new ChatPresenter(mockMarkdownParser, mockCommandParser);
    const message: ChatMessage = {
      id: "msg-7",
      role: "assistant",
      content: "Just a regular message",
      timestamp: new Date("2023-01-01T12:00:00Z"),
    };

    const presented = presenter.present(message);
    expect(presented.actions).toEqual([]);
  });

  describe("__actions__ streaming safety", () => {
    const freshPresenter = () =>
      new ChatPresenter(
        { parse: vi.fn().mockReturnValue({ blocks: [] }) } as unknown as MarkdownParserService,
        { parse: vi.fn().mockReturnValue([]) } as unknown as CommandParserService,
      );

    const msg = (content: string): ChatMessage => ({
      id: "stream-test",
      role: "assistant",
      content,
      timestamp: new Date("2023-01-01T12:00:00Z"),
    });

    it("does not extract from partial tag", () => {
      const presented = freshPresenter().present(msg('__actions__:[{"label":"Open'));
      expect(presented.actions).toEqual([]);
    });

    it("does not extract from unclosed JSON array", () => {
      const presented = freshPresenter().present(msg('__actions__:[{"label":"Open","action":"conversation"}'));
      expect(presented.actions).toEqual([]);
    });

    it("preserves surrounding text when tag is incomplete", () => {
      const p = freshPresenter();
      const mdParser = (p as unknown as { markdownParser: { parse: ReturnType<typeof vi.fn> } }).markdownParser;
      p.present(msg('Hello __actions__:[{"label":"Open'));
      expect(mdParser.parse).toHaveBeenCalledWith(expect.stringContaining("Hello"));
    });

    it("extracts correctly when tag is complete", () => {
      const presented = freshPresenter().present(
        msg('Hello __actions__:[{"label":"Go","action":"route","params":{"path":"/x"}}]'),
      );
      expect(presented.actions).toHaveLength(1);
      expect(presented.actions[0]).toMatchObject({ label: "Go", action: "route" });
    });

    it("produces empty actions array for syntactically complete but malformed JSON", () => {
      const presented = freshPresenter().present(msg("__actions__:[{bad json}]"));
      expect(presented.actions).toEqual([]);
    });

    it("filters out entries with invalid action types from otherwise valid array", () => {
      const presented = freshPresenter().present(
        msg('__actions__:[{"label":"Ok","action":"send","params":{}},{"label":"Bad","action":"nope","params":{}}]'),
      );
      expect(presented.actions).toHaveLength(1);
      expect(presented.actions[0].label).toBe("Ok");
    });

    it("filters out entries missing required action field", () => {
      const presented = freshPresenter().present(
        msg('__actions__:[{"label":"NoAction","params":{}},{"label":"Ok","action":"route","params":{}}]'),
      );
      expect(presented.actions).toHaveLength(1);
      expect(presented.actions[0].label).toBe("Ok");
    });
  });
});
