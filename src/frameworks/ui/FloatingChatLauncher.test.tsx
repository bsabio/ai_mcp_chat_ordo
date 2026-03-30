import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FloatingChatLauncher } from "./FloatingChatLauncher";

vi.mock("@/lib/config/InstanceConfigContext", () => ({
  useInstanceIdentity: () => ({
    name: "Studio Ordo",
  }),
}));

describe("FloatingChatLauncher", () => {
  it("renders the idle floating launcher by default", () => {
    render(<FloatingChatLauncher onOpen={vi.fn()} />);

    const launcher = screen.getByRole("button", { name: "Open Studio Ordo chat" });
    expect(launcher).toHaveAttribute("data-chat-fab-state", "idle");
  });

  it("opens chat on click without rendering an active-work summary", () => {
    const onOpen = vi.fn();

    render(<FloatingChatLauncher onOpen={onOpen} />);

    const launcher = screen.getByRole("button", { name: "Open Studio Ordo chat" });
    expect(launcher).toHaveAttribute("data-chat-fab-state", "idle");

    fireEvent.click(launcher);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("exposes the quiet route tone when journal routes request it", () => {
    render(<FloatingChatLauncher onOpen={vi.fn()} routeTone="quiet" />);

    expect(screen.getByRole("button", { name: "Open Studio Ordo chat" })).toHaveAttribute(
      "data-chat-route-tone",
      "quiet",
    );
  });
});