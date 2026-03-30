import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { User } from "@/core/entities/user";

const { usePathnameMock, siteNavMock, siteFooterMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  siteNavMock: vi.fn(() => <div data-testid="site-nav" />),
  siteFooterMock: vi.fn(() => <div data-testid="site-footer" />),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

vi.mock("@/components/SiteNav", () => ({
  SiteNav: siteNavMock,
}));

vi.mock("@/components/SiteFooter", () => ({
  SiteFooter: siteFooterMock,
}));

import { AppShell } from "@/components/AppShell";

const user: User = {
  id: "usr_1",
  email: "keith@example.com",
  name: "Keith",
  roles: ["AUTHENTICATED"],
};

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the viewport-stage shell on the home route", () => {
    usePathnameMock.mockReturnValue("/");

    const { container } = render(
      <AppShell user={user}>
        <div>home</div>
      </AppShell>,
    );

    expect(container.querySelector('[data-shell-route-mode="viewport-stage"]')).not.toBeNull();
    expect(container.querySelector('[data-shell-viewport-stage="true"]')).not.toBeNull();
    expect(screen.getByTestId("site-nav")).toBeInTheDocument();
    expect(screen.getByTestId("site-footer")).toBeInTheDocument();
    expect(siteNavMock).toHaveBeenCalledWith(expect.objectContaining({ user }), undefined);
  });

  it("uses document flow on non-home routes", () => {
    usePathnameMock.mockReturnValue("/journal");

    const { container } = render(
      <AppShell user={user}>
        <div>blog</div>
      </AppShell>,
    );

    expect(container.querySelector('[data-shell-route-mode="document-flow"]')).not.toBeNull();
    expect(container.querySelector('[data-shell-viewport-stage="true"]')).toBeNull();
    expect(container.querySelector('[data-shell-route-surface="journal"]')).not.toBeNull();
    expect(container.querySelector('[data-shell-main-surface="journal"]')).not.toBeNull();
    expect(screen.getByTestId("site-nav")).toBeInTheDocument();
    expect(screen.getByTestId("site-footer")).toBeInTheDocument();
  });

  it("uses the journal surface on article routes", () => {
    usePathnameMock.mockReturnValue("/journal/systems-essay");

    const { container } = render(
      <AppShell user={user}>
        <div>article</div>
      </AppShell>,
    );

    expect(container.querySelector('[data-shell-route-mode="document-flow"]')).not.toBeNull();
    expect(container.querySelector('[data-shell-route-surface="journal"]')).not.toBeNull();
    expect(container.querySelector('[data-shell-main-surface="journal"]')).not.toBeNull();
  });

  it("marks non-journal document routes with the default surface", () => {
    usePathnameMock.mockReturnValue("/library");

    const { container } = render(
      <AppShell user={user}>
        <div>library</div>
      </AppShell>,
    );

    expect(container.querySelector('[data-shell-route-surface="default"]')).not.toBeNull();
    expect(container.querySelector('[data-shell-main-surface="default"]')).not.toBeNull();
  });

  it("uses document-flow mode and shows footer on admin routes", () => {
    usePathnameMock.mockReturnValue("/admin");

    const { container } = render(
      <AppShell user={user}>
        <div>admin</div>
      </AppShell>,
    );

    expect(container.querySelector('[data-shell-route-mode="document-flow"]')).not.toBeNull();
    expect(container.querySelector('[data-shell-route-surface="admin"]')).not.toBeNull();
    expect(container.querySelector('[data-shell-main-surface="admin"]')).not.toBeNull();
    expect(screen.getByTestId("site-nav")).toBeInTheDocument();
    expect(screen.getByTestId("site-footer")).toBeInTheDocument();
  });
});