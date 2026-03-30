import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";

import type { User } from "@/core/entities/user";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { GlobalSearchBar } from "@/components/GlobalSearchBar";

describe("GlobalSearchBar", () => {
  const mockSearchAction = vi.fn();
  const user: User = {
    id: "usr_1",
    email: "user@example.com",
    name: "User",
    roles: ["AUTHENTICATED"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchAction.mockResolvedValue([]);
  });

  it("renders the search input on desktop", () => {
    render(<GlobalSearchBar user={user} searchAction={mockSearchAction} />);
    expect(screen.getByLabelText("Search pages and accessible content")).toBeInTheDocument();
  });

  it("renders the mobile toggle button", () => {
    render(<GlobalSearchBar user={user} searchAction={mockSearchAction} />);
    expect(screen.getByLabelText("Open search")).toBeInTheDocument();
  });

  it("shows keyboard shortcut hint", () => {
    render(<GlobalSearchBar user={user} searchAction={mockSearchAction} />);
    expect(screen.getByText("⌘K")).toBeInTheDocument();
  });

  it("does not call search for single character input", async () => {
    vi.useFakeTimers();
    render(<GlobalSearchBar user={user} searchAction={mockSearchAction} />);
    const input = screen.getByLabelText("Search pages and accessible content");
    fireEvent.change(input, { target: { value: "a" } });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(mockSearchAction).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("switches to command mode when the query starts with a slash", () => {
    render(<GlobalSearchBar user={user} searchAction={mockSearchAction} />);

    fireEvent.change(screen.getByLabelText("Search pages and accessible content"), {
      target: { value: "/lib" },
    });

    expect(screen.getByLabelText("Navigate to available pages")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /library/i })).toBeInTheDocument();
  });

  it("navigates with the router for entity results", async () => {
    vi.useFakeTimers();
    mockSearchAction.mockResolvedValue([
      {
        kind: "admin-entity",
        id: "user:usr_1",
        title: "Keith Williams",
        subtitle: "User — keith@example.com",
        href: "/admin/users/usr_1",
        audience: "admin",
        source: "admin",
        entityType: "user",
      },
    ]);

    render(<GlobalSearchBar user={user} searchAction={mockSearchAction} />);
    fireEvent.change(screen.getByLabelText("Search pages and accessible content"), {
      target: { value: "keith" },
    });

    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: /keith williams/i }));
    expect(pushMock).toHaveBeenCalledWith("/admin/users/usr_1");
    vi.useRealTimers();
  });
});
