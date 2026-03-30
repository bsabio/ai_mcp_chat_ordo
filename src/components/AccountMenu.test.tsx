import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  usePathnameMock,
  useThemeMock,
  switchRoleMock,
  logoutMock,
  resolveAccountMenuRoutesMock,
} = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  useThemeMock: vi.fn(),
  switchRoleMock: vi.fn(),
  logoutMock: vi.fn(),
  resolveAccountMenuRoutesMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

vi.mock("@/components/ThemeProvider", () => ({
  useTheme: useThemeMock,
}));

vi.mock("@/hooks/useMockAuth", () => ({
  useMockAuth: () => ({
    switchRole: switchRoleMock,
    logout: logoutMock,
  }),
}));

vi.mock("@/lib/shell/shell-navigation", () => ({
  resolveAccountMenuRoutes: resolveAccountMenuRoutesMock,
}));

import { AccountMenu } from "@/components/AccountMenu";

describe("AccountMenu RBAC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    usePathnameMock.mockReturnValue("/profile");
    useThemeMock.mockReturnValue({
      isDark: false,
      setIsDark: vi.fn(),
      accessibility: {
        fontSize: "md",
        lineHeight: "normal",
        letterSpacing: "normal",
        density: "normal",
        colorBlindMode: "none",
      },
      setAccessibility: vi.fn(),
    });
    resolveAccountMenuRoutesMock.mockReturnValue([
      { id: "jobs", href: "/jobs", label: "Jobs" },
      { id: "profile", href: "/profile", label: "Profile" },
    ]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("hides admin simulation controls from authenticated non-admin users", () => {
    render(
      <AccountMenu
        user={{
          id: "usr_1",
          email: "user@example.com",
          name: "Standard User",
          roles: ["AUTHENTICATED"],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /standard user/i }));

    expect(screen.getByRole("link", { name: "Jobs" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Simulation Mode" })).not.toBeInTheDocument();
  });

  it("shows simulation controls to non-admin users in development mode", () => {
    vi.stubEnv("NODE_ENV", "development");

    render(
      <AccountMenu
        user={{
          id: "usr_2",
          email: "staff@example.com",
          name: "Staff User",
          roles: ["STAFF"],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /staff user/i }));

    expect(screen.getByRole("button", { name: "Simulation Mode" })).toBeInTheDocument();
  });

  it("shows admin simulation controls to admins", () => {
    render(
      <AccountMenu
        user={{
          id: "usr_admin",
          email: "admin@example.com",
          name: "Admin User",
          roles: ["ADMIN"],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /admin user/i }));

    expect(screen.getByRole("button", { name: "Simulation Mode" })).toBeInTheDocument();
  });
});