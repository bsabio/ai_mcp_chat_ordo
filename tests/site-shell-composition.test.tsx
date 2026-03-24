import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/AppShell";
import {
  resolveFooterGroups,
  resolveFooterGroupRoutes,
  resolvePrimaryNavRoutes,
} from "@/lib/shell/shell-navigation";
import type { User } from "@/core/entities/user";

let pathname = "/";

const baseUser: User = {
  id: "usr_1",
  email: "user@example.com",
  name: "Test User",
  roles: ["AUTHENTICATED"],
};

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/AccountMenu", () => ({
  AccountMenu: () => <div data-testid="account-menu" />,
}));

describe("site shell composition", () => {
  beforeEach(() => {
    pathname = "/";
  });

  function renderShell() {
    return render(
      <AppShell user={baseUser}>
        <div>Shell Content</div>
      </AppShell>,
    );
  }

  it("reuses the shared brand primitive in both header and footer", () => {
    const { container } = renderShell();

    expect(container.querySelectorAll('[data-shell-brand="true"]')).toHaveLength(2);
  });

  it("renders footer groups from the canonical shell footer definitions", () => {
    renderShell();

    const footer = screen.getByRole("contentinfo");

    for (const group of resolveFooterGroups(baseUser)) {
      const groupHeading = within(footer).getByText(group.label);
      const groupContainer = groupHeading.parentElement;

      expect(groupContainer).not.toBeNull();

      for (const route of resolveFooterGroupRoutes(group, baseUser)) {
        expect(within(groupContainer as HTMLElement).getByRole("link", { name: route.label })).toHaveAttribute(
          "href",
          route.href,
        );
      }
    }
  });

  it("marks the active canonical nav item based on the current route", () => {
    pathname = "/library";

    renderShell();

    const nav = screen.getByRole("navigation", { name: "Primary" });
    const footer = screen.getByRole("contentinfo");

    expect(within(nav).getByRole("link", { name: "Library" })).toHaveAttribute("href", "/library");
    expect(within(footer).getByRole("link", { name: "Library" })).toHaveAttribute("href", "/library");
    expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(within(nav).queryByRole("link", { name: "Dashboard" })).toBeNull();
  });

  it("renders the public blog route in both the primary nav and footer", () => {
    renderShell();

    const nav = screen.getByRole("navigation", { name: "Primary" });
    const footer = screen.getByRole("contentinfo");

    expect(within(nav).getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");
    expect(within(footer).getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");
  });

  it("does not reintroduce the dead footer routes removed from the canonical shell model", () => {
    renderShell();

    const footer = screen.getByRole("contentinfo");

    for (const label of [
      "Training",
      "Studio",
      "Documentation",
      "Patterns",
      "API",
      "Privacy",
      "Terms",
    ]) {
      expect(within(footer).queryByRole("link", { name: label })).toBeNull();
    }
  });

  it("keeps footer supporting copy truthful to the current shell", () => {
    renderShell();

    const footer = screen.getByRole("contentinfo");

    expect(within(footer).queryByText("Global Status: Optimal")).toBeNull();
  });

  it("renders only the canonical primary nav labels", () => {
    renderShell();

    const nav = screen.getByRole("navigation", { name: "Primary" });

    expect(resolvePrimaryNavRoutes(baseUser).map((route) => route.id)).toEqual(["home", "corpus", "blog"]);
    expect(within(nav).getByRole("link", { name: /studio ordo home/i })).toHaveAttribute("href", "/");
    expect(nav.querySelector('[data-shell-nav-region="primary-links"]')).not.toBeNull();
    expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: "Library" })).toHaveAttribute("href", "/library");
    expect(within(nav).getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");
  });
});