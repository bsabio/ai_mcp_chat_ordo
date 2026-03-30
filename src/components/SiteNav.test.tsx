import fs from "node:fs";
import path from "node:path";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { User } from "@/core/entities/user";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

vi.mock("@/components/shell/ShellBrand", () => ({
  ShellBrand: ({ href, className }: { href: string; className?: string }) => (
    <a href={href} className={className} data-testid="shell-brand">
      Studio Ordo
    </a>
  ),
}));

vi.mock("@/components/AccountMenu", () => ({
  AccountMenu: () => <div data-testid="account-menu" />,
}));

vi.mock("@/components/GlobalSearchBar", () => ({
  GlobalSearchBar: () => <div data-testid="global-search" />,
}));

vi.mock("@/lib/shell/shell-navigation", () => ({
  resolvePrimaryNavRoutes: () => [
    { id: "home", href: "/", label: "Home" },
    { id: "journal", href: "/journal", label: "Journal" },
  ],
  resolveShellHomeHref: () => "/",
  isShellRouteActive: (item: { href: string }, pathname: string) => pathname === item.href,
}));

import { SiteNav } from "@/components/SiteNav";

const user: User = {
  id: "usr_1",
  email: "keith@example.com",
  name: "Keith",
  roles: ["AUTHENTICATED"],
};

describe("SiteNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the quiet nav tone on the journal index", () => {
    usePathnameMock.mockReturnValue("/journal");

    render(<SiteNav user={user} />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toHaveAttribute("data-shell-nav-tone", "quiet");
    expect(nav.className).toContain("ui-shell-rail");
    expect(screen.getByRole("list", { name: "Primary links" })).toHaveAttribute("data-shell-nav-links-tone", "quiet");
    expect(screen.getByRole("list", { name: "Primary links" }).className).toContain("ui-shell-nav-links");
    expect(screen.getByRole("link", { name: "Journal" })).toHaveAttribute("data-shell-nav-item-tone", "quiet");
  });

  it("uses the quiet nav tone on journal article routes", () => {
    usePathnameMock.mockReturnValue("/journal/systems-essay");

    render(<SiteNav user={user} />);

    expect(screen.getByRole("navigation", { name: "Primary" })).toHaveAttribute("data-shell-nav-tone", "quiet");
  });

  it("keeps the default nav tone on non-journal routes", () => {
    usePathnameMock.mockReturnValue("/library");

    render(<SiteNav user={user} />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toHaveAttribute("data-shell-nav-tone", "default");
    expect(screen.getByRole("list", { name: "Primary links" })).toHaveAttribute("data-shell-nav-links-tone", "default");
  });

  it("renders the shell-owned global search region", () => {
    usePathnameMock.mockReturnValue("/");

    render(<SiteNav user={user} />);

    expect(screen.getByTestId("global-search")).toBeInTheDocument();
  });

  it("keeps spacing ladder and rail tokens in the global foundation authority", () => {
    const foundationCss = fs.readFileSync(
      path.join(process.cwd(), "src/app/styles/foundation.css"),
      "utf8",
    );

    expect(foundationCss).toContain("@property --space-1");
    expect(foundationCss).toContain("@property --space-rail-gap");
    expect(foundationCss).toContain("--container-padding: var(--space-frame-default);");
  });
});