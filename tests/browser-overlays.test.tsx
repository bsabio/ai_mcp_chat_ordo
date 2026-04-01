import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MentionsMenu from "@/components/MentionsMenu";
import { AccountMenu } from "@/components/AccountMenu";
import { ShellNavDrawer } from "@/components/ShellNavDrawer";
import { ShellWorkspaceMenu } from "@/components/ShellWorkspaceMenu";
import { ThemeProvider } from "@/components/ThemeProvider";
import type { MentionItem } from "@/core/entities/mentions";
import type { User } from "@/core/entities/user";

const pushMock = vi.fn();
const switchRoleMock = vi.fn();
const logoutMock = vi.fn();

const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

const matchMediaMock = vi.fn((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/useMockAuth", () => ({
  useMockAuth: () => ({
    switchRole: switchRoleMock,
    logout: logoutMock,
  }),
}));

const authenticatedUser: User = {
  id: "usr_1",
  email: "user@example.com",
  name: "Test User",
  roles: ["AUTHENTICATED"],
};

const mentionSuggestions: MentionItem[] = [
  {
    id: "cmd-search",
    name: "Search Library",
    category: "command",
    description: "Find matching material",
  },
  {
    id: "framework-solid",
    name: "SOLID",
    category: "framework",
    description: "Design principles",
  },
];

beforeEach(() => {
  pushMock.mockReset();
  switchRoleMock.mockReset();
  logoutMock.mockReset();
  localStorageMock.getItem.mockReset();
  localStorageMock.getItem.mockReturnValue(null);
  localStorageMock.setItem.mockReset();
  localStorageMock.removeItem.mockReset();
  localStorageMock.clear.mockReset();
  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("matchMedia", matchMediaMock);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("browser overlay hardening", () => {
  it("dismisses the account menu on pointer interactions outside the panel", async () => {
    render(
      <ThemeProvider>
        <div>
          <AccountMenu user={authenticatedUser} />
          <button type="button">Outside target</button>
        </div>
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /test user/i }));
    expect(await screen.findByText("System Legibility")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside target" }));

    await waitFor(() => {
      expect(screen.queryByText("System Legibility")).not.toBeInTheDocument();
    });
  });

  it("dismisses the shell navigation drawer on pointer interactions outside the panel", async () => {
    render(
      <div data-testid="shell-rail">
        <ShellNavDrawer user={authenticatedUser} />
        <button type="button">Outside target</button>
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const dialog = await screen.findByRole("dialog", { name: "Primary navigation" });

    expect(dialog).toBeInTheDocument();
    expect(screen.getByTestId("shell-rail").contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside target" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Primary navigation" })).not.toBeInTheDocument();
    });
  });

  it("portals the workspace menu outside the shell rail container", async () => {
    render(
      <ThemeProvider>
        <div data-testid="shell-rail">
          <ShellWorkspaceMenu user={authenticatedUser} />
        </div>
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open workspace menu" }));

    const dialog = await screen.findByRole("dialog", { name: "Workspace menu" });

    expect(screen.getByTestId("shell-rail").contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it("renders mention suggestions with selectable listbox semantics", () => {
    const onSelect = vi.fn();

    render(
      <div className="relative h-40 w-md">
        <MentionsMenu
          suggestions={mentionSuggestions}
          activeIndex={1}
          onSelect={onSelect}
        />
      </div>,
    );

    const listbox = screen.getByRole("listbox", { name: "Mention suggestions" });
    expect(listbox).toBeInTheDocument();

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[1]).toHaveAttribute("aria-selected", "true");

    fireEvent.click(options[0]);
    expect(onSelect).toHaveBeenCalledWith(mentionSuggestions[0]);
  });
});