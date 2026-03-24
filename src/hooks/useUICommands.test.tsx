import { act, render, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import { useUICommands } from "@/hooks/useUICommands";
import type { PresentedMessage } from "@/adapters/ChatPresenter";
import { BLOCK_TYPES, INLINE_TYPES } from "@/core/entities/rich-content";

const pushMock = vi.fn();
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function installMatchMedia() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

function UICommandsHarness({ messages, isLoadingMessages = false }: { messages: PresentedMessage[]; isLoadingMessages?: boolean }) {
  useUICommands(messages, isLoadingMessages);
  const { theme, accessibility } = useTheme();

  return (
    <div
      data-testid="ui-state"
      data-theme={theme}
      data-density={accessibility.density}
      data-font-size={accessibility.fontSize}
    />
  );
}

describe("useUICommands", () => {
  beforeEach(() => {
    pushMock.mockReset();
    localStorageMock.store = {};
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    vi.stubGlobal("localStorage", localStorageMock);
    installMatchMedia();
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-density");
    document.documentElement.removeAttribute("data-color-blind");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.className = "";
  });

  function createAssistantMessage(
    id: string,
    rawContent: string,
    commands: PresentedMessage["commands"],
  ): PresentedMessage {
    return {
      id,
      role: "assistant",
      content: {
        blocks: [
          {
            type: BLOCK_TYPES.PARAGRAPH,
            content: [{ type: INLINE_TYPES.TEXT, text: rawContent }],
          },
        ],
      },
      rawContent,
      commands,
      suggestions: [],
      actions: [],
      attachments: [],
      timestamp: "10:00 AM",
    };
  }

  it("applies set_theme commands when a new assistant message arrives after baseline", async () => {
    const baselineMessages: PresentedMessage[] = [
      createAssistantMessage("assistant-baseline", "Welcome", []),
    ];
    const nextMessages: PresentedMessage[] = [
      ...baselineMessages,
      createAssistantMessage("assistant-1", "Switching theme", [{ type: "set_theme", theme: "bauhaus" }]),
    ];

    const { getByTestId, rerender } = render(
      <ThemeProvider>
        <UICommandsHarness messages={baselineMessages} />
      </ThemeProvider>,
    );

    rerender(
      <ThemeProvider>
        <UICommandsHarness messages={nextMessages} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("theme-bauhaus")).toBe(true);
    });

    expect(getByTestId("ui-state")).toHaveAttribute("data-theme", "bauhaus");
  });

  it("applies adjust_ui commands when a new assistant message arrives after baseline", async () => {
    const baselineMessages: PresentedMessage[] = [
      createAssistantMessage("assistant-baseline", "Welcome", []),
    ];
    const nextMessages: PresentedMessage[] = [
      ...baselineMessages,
      createAssistantMessage("assistant-2", "Adjusting UI", [{
        type: "adjust_ui",
        settings: { density: "relaxed", fontSize: "xl" },
      }]),
    ];

    const { getByTestId, rerender } = render(
      <ThemeProvider>
        <UICommandsHarness messages={baselineMessages} />
      </ThemeProvider>,
    );

    rerender(
      <ThemeProvider>
        <UICommandsHarness messages={nextMessages} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-density")).toBe("relaxed");
    });

    expect(getByTestId("ui-state")).toHaveAttribute("data-density", "relaxed");
    expect(getByTestId("ui-state")).toHaveAttribute("data-font-size", "xl");
  });

  it("does not replay historical commands from restored history on initial baseline", async () => {
    const historyMessages: PresentedMessage[] = [
      createAssistantMessage("assistant-3", "Switching theme once", [{ type: "set_theme", theme: "swiss" }]),
    ];

    render(
      <ThemeProvider>
        <UICommandsHarness messages={historyMessages} isLoadingMessages />
      </ThemeProvider>,
    );

    expect(document.documentElement.classList.contains("theme-swiss")).toBe(false);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("does not re-run the same assistant command for the same message list", async () => {
    const baselineMessages: PresentedMessage[] = [
      createAssistantMessage("assistant-baseline", "Welcome", []),
    ];
    const nextMessages: PresentedMessage[] = [
      ...baselineMessages,
      createAssistantMessage("assistant-4", "Switching theme once", [{ type: "set_theme", theme: "swiss" }]),
    ];

    const { rerender } = render(
      <ThemeProvider>
        <UICommandsHarness messages={baselineMessages} />
      </ThemeProvider>,
    );

    rerender(
      <ThemeProvider>
        <UICommandsHarness messages={nextMessages} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("theme-swiss")).toBe(true);
    });

    await act(async () => {
      rerender(
        <ThemeProvider>
          <UICommandsHarness messages={nextMessages} />
        </ThemeProvider>,
      );
    });

    expect(pushMock).not.toHaveBeenCalled();
    expect(document.documentElement.classList.contains("theme-swiss")).toBe(true);
  });

  it("preserves adjust_ui state on the document element after the consuming component remounts", async () => {
    const baselineMessages: PresentedMessage[] = [
      createAssistantMessage("assistant-baseline", "Welcome", []),
    ];
    const adjustMessages: PresentedMessage[] = [
      ...baselineMessages,
      createAssistantMessage("assistant-5", "Making compact", [{
        type: "adjust_ui",
        settings: { density: "compact" },
      }]),
    ];

    const { rerender } = render(
      <ThemeProvider>
        <UICommandsHarness messages={baselineMessages} />
      </ThemeProvider>,
    );

    rerender(
      <ThemeProvider>
        <UICommandsHarness messages={adjustMessages} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-density")).toBe("compact");
    });

    // Simulate the floating shell closing while ThemeProvider persists
    rerender(
      <ThemeProvider>
        <div data-testid="placeholder" />
      </ThemeProvider>,
    );

    expect(document.documentElement.getAttribute("data-density")).toBe("compact");

    // Simulate the floating shell reopening — state should still be intact
    rerender(
      <ThemeProvider>
        <UICommandsHarness messages={adjustMessages} />
      </ThemeProvider>,
    );

    expect(document.documentElement.getAttribute("data-density")).toBe("compact");
  });
});