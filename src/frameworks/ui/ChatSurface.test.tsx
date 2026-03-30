import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

vi.mock("./FloatingChatLauncher", () => ({
  FloatingChatLauncher: ({ onOpen, routeTone }: { onOpen: () => void; routeTone?: string }) => (
    <button type="button" data-testid="floating-chat-launcher" data-route-tone={routeTone} onClick={onOpen}>
      Open launcher
    </button>
  ),
}));

vi.mock("./FloatingChatFrame", () => ({
  FloatingChatFrame: ({ children }: { children: React.ReactNode }) => <div data-testid="floating-chat-frame">{children}</div>,
}));

vi.mock("./ChatSurfaceHeader", () => ({
  ChatSurfaceHeader: () => <div data-testid="chat-surface-header" />,
}));

vi.mock("./ChatContentSurface", () => ({
  ChatContentSurface: () => <div data-testid="chat-content-surface" />,
}));

vi.mock("./useChatSurfaceState", () => ({
  useChatSurfaceState: () => ({
    contentProps: {},
  }),
}));

vi.mock("@/hooks/useViewTransitionReady", () => ({
  useViewTransitionReady: () => false,
}));

import { ChatSurface } from "./ChatSurface";

describe("ChatSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("suppresses the floating launcher on the home route", () => {
    usePathnameMock.mockReturnValue("/");

    const { container } = render(<ChatSurface mode="floating" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("suppresses the floating launcher on admin routes", () => {
    usePathnameMock.mockReturnValue("/admin/leads");

    const { container } = render(<ChatSurface mode="floating" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the floating launcher on non-admin content routes", () => {
    usePathnameMock.mockReturnValue("/library");

    render(<ChatSurface mode="floating" />);

    expect(screen.getByTestId("floating-chat-launcher")).toHaveAttribute("data-route-tone", "default");
  });

  it("uses the quiet route tone for journal routes", () => {
    usePathnameMock.mockReturnValue("/journal");

    render(<ChatSurface mode="floating" />);

    expect(screen.getByTestId("floating-chat-launcher")).toHaveAttribute("data-route-tone", "quiet");
  });
});