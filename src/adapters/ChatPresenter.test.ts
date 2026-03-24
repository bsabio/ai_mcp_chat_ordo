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
    const markdownParser = {
      parse: vi.fn().mockReturnValue({ blocks: [] }),
    } as unknown as MarkdownParserService;
    const presenter = new ChatPresenter(markdownParser, mockCommandParser);
    const message: ChatMessage = {
      id: "msg-5",
      role: "assistant",
      content: "Text __actions__:[not valid json]",
      timestamp: new Date("2023-01-01T12:00:00Z"),
    };

    const presented = presenter.present(message);
    expect(presented.actions).toEqual([]);
    expect(markdownParser.parse).toHaveBeenCalledWith("Text");
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

  it("maps structured UI tool_call parts into UI commands", () => {
    const presenter = new ChatPresenter(mockMarkdownParser, mockCommandParser);
    const message: ChatMessage = {
      id: "msg-8",
      role: "assistant",
      content: "Applying your preferences.",
      timestamp: new Date("2023-01-01T12:00:00Z"),
      parts: [
        {
          type: "tool_call",
          name: "set_theme",
          args: { theme: "bauhaus" },
        },
        {
          type: "tool_call",
          name: "adjust_ui",
          args: { density: "compact", fontSize: "xl" },
        },
      ],
    };

    const presented = presenter.present(message);

    expect(presented.commands).toEqual([
      { type: "set_theme", theme: "bauhaus" },
      {
        type: "adjust_ui",
        settings: { density: "compact", fontSize: "xl" },
      },
    ]);
  });

  it("preserves generate_chart metadata for mermaid blocks", () => {
    const presenter = new ChatPresenter(mockMarkdownParser, mockCommandParser);
    const message: ChatMessage = {
      id: "msg-9",
      role: "assistant",
      content: "Here is the funnel chart.",
      timestamp: new Date("2023-01-01T12:00:00Z"),
      parts: [
        {
          type: "tool_call",
          name: "generate_chart",
          args: {
            code: "flowchart TD\nA[Anonymous conversations: 53] --> B[Drop-off risk: 23]",
            title: "Anonymous Funnel",
            caption: "Anonymous Funnel",
            downloadFileName: "anonymous_funnel",
          },
        },
      ],
    };

    const presented = presenter.present(message);

    expect(presented.content.blocks).toContainEqual({
      type: "code-block",
      code: "flowchart TD\nA[Anonymous conversations: 53] --> B[Drop-off risk: 23]",
      language: "mermaid",
      title: "Anonymous Funnel",
      caption: "Anonymous Funnel",
      downloadFileName: "anonymous_funnel",
    });
  });

  it("builds mermaid code from structured generate_chart specs", () => {
    const presenter = new ChatPresenter(mockMarkdownParser, mockCommandParser);
    const message: ChatMessage = {
      id: "msg-10",
      role: "assistant",
      content: "Here is the funnel chart.",
      timestamp: new Date("2023-01-01T12:00:00Z"),
      parts: [
        {
          type: "tool_call",
          name: "generate_chart",
          args: {
            title: "Pipeline Health",
            caption: "Live conversion flow",
            spec: {
              chartType: "flowchart",
              direction: "LR",
              nodes: [
                { id: "conversations", label: "Anonymous conversations: 53" },
                { id: "risk", label: "At-risk drop-off: 23", shape: "diamond" },
                { id: "converted", label: "Converted leads: 1", shape: "round" },
              ],
              edges: [
                { from: "conversations", to: "risk", label: "review now" },
                { from: "risk", to: "converted", label: "recover" },
              ],
            },
          },
        },
      ],
    };

    const presented = presenter.present(message);
    expect(presented.content.blocks).toContainEqual({
      type: "code-block",
      code: expect.stringContaining("flowchart LR"),
      language: "mermaid",
      title: "Pipeline Health",
      caption: "Live conversion flow",
      downloadFileName: undefined,
    });
  });

  it("skips invalid generate_chart tool payloads", () => {
    const markdownParser = {
      parse: vi.fn().mockReturnValue({ blocks: [] }),
    } as unknown as MarkdownParserService;
    const presenter = new ChatPresenter(markdownParser, mockCommandParser);
    const message: ChatMessage = {
      id: "msg-11",
      role: "assistant",
      content: "Broken chart attempt.",
      timestamp: new Date("2023-01-01T12:00:00Z"),
      parts: [
        {
          type: "tool_call",
          name: "generate_chart",
          args: {
            spec: { chartType: "flowchart", nodes: [] },
          },
        },
      ],
    };

    const presented = presenter.present(message);
    expect(presented.content.blocks).toEqual([]);
  });

  it("maps generate_graph tool calls into graph blocks", () => {
    const presenter = new ChatPresenter(mockMarkdownParser, mockCommandParser);
    const message: ChatMessage = {
      id: "msg-12",
      role: "assistant",
      content: "Here is the weekly trend.",
      timestamp: new Date("2023-01-01T12:00:00Z"),
      parts: [
        {
          type: "tool_call",
          name: "generate_graph",
          args: {
            title: "Lead trend",
            caption: "Weekly qualified leads",
            summary: "Qualified leads increased week over week.",
            data: {
              rows: [
                { week: "W1", leads: 4 },
                { week: "W2", leads: 7 },
              ],
            },
            spec: {
              graphType: "line",
              xField: "week",
              yField: "leads",
            },
          },
        },
      ],
    };

    const presented = presenter.present(message);
    expect(presented.content.blocks).toContainEqual({
      type: "graph",
      title: "Lead trend",
      caption: "Weekly qualified leads",
      summary: "Qualified leads increased week over week.",
      downloadFileName: undefined,
      source: undefined,
      dataPreview: [
        { week: "W1", leads: 4 },
        { week: "W2", leads: 7 },
      ],
      graph: {
        kind: "line",
        data: [
          { week: "W1", leads: 4 },
          { week: "W2", leads: 7 },
        ],
        x: { field: "week", type: "ordinal", label: undefined },
        y: { field: "leads", type: "quantitative", label: undefined },
        series: undefined,
        columns: ["week", "leads"],
      },
    });
  });

  it("prefers resolved generate_graph tool results when present", () => {
    const presenter = new ChatPresenter(mockMarkdownParser, mockCommandParser);
    const message: ChatMessage = {
      id: "msg-12b",
      role: "assistant",
      content: "Here is the routing view.",
      timestamp: new Date("2023-01-01T12:00:00Z"),
      parts: [
        {
          type: "tool_call",
          name: "generate_graph",
          args: {
            data: { source: { sourceType: "routing_review" } },
            spec: { graphType: "bar", xField: "bucket", yField: "count" },
          },
        },
        {
          type: "tool_result",
          name: "generate_graph",
          result: {
            summary: "Uncertain conversations dominate the review queue.",
            source: {
              sourceType: "routing_review",
              label: "Routing review summary",
              rowCount: 2,
            },
            graph: {
              kind: "bar",
              data: [
                { bucket: "Recently changed", count: 2 },
                { bucket: "Uncertain", count: 5 },
              ],
              x: { field: "bucket", type: "ordinal" },
              y: { field: "count", type: "quantitative" },
              columns: ["bucket", "count"],
              source: {
                sourceType: "routing_review",
                label: "Routing review summary",
                rowCount: 2,
              },
            },
            dataPreview: [
              { bucket: "Recently changed", count: 2 },
              { bucket: "Uncertain", count: 5 },
            ],
          },
        },
      ],
    };

    const presented = presenter.present(message);
    expect(presented.content.blocks).toContainEqual({
      type: "graph",
      title: undefined,
      caption: undefined,
      summary: "Uncertain conversations dominate the review queue.",
      downloadFileName: undefined,
      source: {
        sourceType: "routing_review",
        label: "Routing review summary",
        rowCount: 2,
      },
      dataPreview: [
        { bucket: "Recently changed", count: 2 },
        { bucket: "Uncertain", count: 5 },
      ],
      graph: {
        kind: "bar",
        data: [
          { bucket: "Recently changed", count: 2 },
          { bucket: "Uncertain", count: 5 },
        ],
        x: { field: "bucket", type: "ordinal" },
        y: { field: "count", type: "quantitative" },
        columns: ["bucket", "count"],
        source: {
          sourceType: "routing_review",
          label: "Routing review summary",
          rowCount: 2,
        },
      },
    });
  });

  it("skips invalid generate_graph payloads", () => {
    const markdownParser = {
      parse: vi.fn().mockReturnValue({ blocks: [] }),
    } as unknown as MarkdownParserService;
    const presenter = new ChatPresenter(markdownParser, mockCommandParser);
    const message: ChatMessage = {
      id: "msg-13",
      role: "assistant",
      content: "Broken graph attempt.",
      timestamp: new Date("2023-01-01T12:00:00Z"),
      parts: [
        {
          type: "tool_call",
          name: "generate_graph",
          args: {
            data: {
              rows: [{ label: "W1", status: "high" }],
            },
            spec: {
              graphType: "bar",
              xField: "label",
              yField: "status",
            },
          },
        },
      ],
    };

    const presented = presenter.present(message);
    expect(presented.content.blocks).toEqual([]);
  });

  it("renders profile tool results as rich content instead of raw JSON", () => {
    const presenter = new ChatPresenter(mockMarkdownParser, mockCommandParser);
    const message: ChatMessage = {
      id: "msg-profile",
      role: "assistant",
      content: "Here are your account details.",
      timestamp: new Date("2023-01-01T12:00:00Z"),
      parts: [
        {
          type: "tool_call",
          name: "get_my_profile",
          args: {},
        },
        {
          type: "tool_result",
          name: "get_my_profile",
          result: {
            action: "get_my_profile",
            message: "Returned the current profile fields and referral settings for this account.",
            profile: {
              name: "Morgan Lee",
              email: "morgan@example.com",
              credential: "Enterprise AI practitioner",
              affiliate_enabled: true,
              referral_code: "mentor-42",
              referral_url: "https://studioordo.com/?ref=mentor-42",
              qr_code_url: "/api/qr/mentor-42",
              roles: ["APPRENTICE"],
            },
          },
        },
      ],
    };

    const presented = presenter.present(message);
    expect(presented.content.blocks).toContainEqual({
      type: "heading",
      level: 2,
      content: [{ type: "text", text: "Current Profile" }],
    });
    expect(presented.content.blocks).toContainEqual({
      type: "paragraph",
      content: [
        { type: "text", text: "Open your " },
        { type: "action-link", label: "profile page", actionType: "route", value: "/profile" },
        { type: "text", text: " to manage the same fields and referral settings." },
      ],
    });
  });

  it("renders referral QR tool results with a share summary", () => {
    const presenter = new ChatPresenter(mockMarkdownParser, mockCommandParser);
    const message: ChatMessage = {
      id: "msg-qr",
      role: "assistant",
      content: "Here is the referral package.",
      timestamp: new Date("2023-01-01T12:00:00Z"),
      parts: [
        {
          type: "tool_call",
          name: "get_my_referral_qr",
          args: {},
        },
        {
          type: "tool_result",
          name: "get_my_referral_qr",
          result: {
            action: "get_my_referral_qr",
            message: "Returned the share link and QR code URL for this account's referral code.",
            referral_code: "mentor-42",
            referral_url: "https://studioordo.com/?ref=mentor-42",
            qr_code_url: "/api/qr/mentor-42",
            manage_route: "/profile",
          },
        },
      ],
    };

    const presented = presenter.present(message);
    expect(presented.content.blocks).toContainEqual({
      type: "heading",
      level: 2,
      content: [{ type: "text", text: "Referral QR" }],
    });
    expect(presented.content.blocks).toContainEqual({
      type: "list",
      items: [
        [{ type: "text", text: "Use the referral link for direct sharing." }],
        [{ type: "action-link", label: "Open referral link", actionType: "external", value: "https://studioordo.com/?ref=mentor-42" }],
        [{ type: "action-link", label: "Open QR image", actionType: "external", value: "/api/qr/mentor-42" }],
        [
          { type: "text", text: "Open your " },
          { type: "action-link", label: "profile page", actionType: "route", value: "/profile" },
          { type: "text", text: " to preview or download the QR image." },
        ],
      ],
    });
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
      const p = freshPresenter();
      const mdParser = (p as unknown as { markdownParser: { parse: ReturnType<typeof vi.fn> } }).markdownParser;
      const presented = p.present(msg('__actions__:[{"label":"Open'));
      expect(presented.actions).toEqual([]);
      expect(mdParser.parse).toHaveBeenCalledWith("");
    });

    it("does not extract from unclosed JSON array", () => {
      const p = freshPresenter();
      const mdParser = (p as unknown as { markdownParser: { parse: ReturnType<typeof vi.fn> } }).markdownParser;
      const presented = p.present(msg('__actions__:[{"label":"Open","action":"conversation"}'));
      expect(presented.actions).toEqual([]);
      expect(mdParser.parse).toHaveBeenCalledWith("");
    });

    it("preserves surrounding text while hiding incomplete tag markup", () => {
      const p = freshPresenter();
      const mdParser = (p as unknown as { markdownParser: { parse: ReturnType<typeof vi.fn> } }).markdownParser;
      p.present(msg('Hello __actions__:[{"label":"Open'));
      expect(mdParser.parse).toHaveBeenCalledWith("Hello");
    });

    it("extracts correctly when tag is complete", () => {
      const presented = freshPresenter().present(
        msg('Hello __actions__:[{"label":"Go","action":"route","params":{"path":"/x"}}]'),
      );
      expect(presented.actions).toHaveLength(1);
      expect(presented.actions[0]).toMatchObject({ label: "Go", action: "route" });
    });

    it("produces empty actions array for syntactically complete but malformed JSON", () => {
      const p = freshPresenter();
      const mdParser = (p as unknown as { markdownParser: { parse: ReturnType<typeof vi.fn> } }).markdownParser;
      const presented = p.present(msg("__actions__:[{bad json}]"));
      expect(presented.actions).toEqual([]);
      expect(mdParser.parse).toHaveBeenCalledWith("");
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

    it("extracts complete action arrays with nested params without leaking raw markup", () => {
      const presenter = freshPresenter();
      const markdownParser = (presenter as unknown as { markdownParser: { parse: ReturnType<typeof vi.fn> } }).markdownParser;

      const presented = presenter.present(
        msg(
          'Want me to generate this? __actions__:[{"label":"Generate training path chart","action":"send","params":{"text":"Generate a chart of the mixed product team training path"}},{"label":"Open Cross-Functional Leadership","action":"corpus","params":{"id":"cross-functional-leadership","highlights":["phase-1","phase-2"]}}]',
        ),
      );

      expect(presented.actions).toHaveLength(2);
      expect(presented.actions[1]).toMatchObject({
        label: "Open Cross-Functional Leadership",
        action: "corpus",
      });
      expect(markdownParser.parse).toHaveBeenCalledWith("Want me to generate this?");
    });
  });
});
