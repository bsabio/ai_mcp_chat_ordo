"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ShellBrand } from "@/components/shell/ShellBrand";
import { GlobalSearchBar } from "@/components/GlobalSearchBar";
import {
  isShellRouteActive,
  resolvePrimaryNavRoutes,
  resolveShellHomeHref,
} from "@/lib/shell/shell-navigation";
import type { GlobalSearchAction } from "@/lib/search/global-search";

import { AccountMenu } from "./AccountMenu";
import type { User as SessionUser } from "@/core/entities/user";

interface SiteNavProps {
  user: SessionUser;
  searchAction?: GlobalSearchAction;
}

export function SiteNav({ user, searchAction }: SiteNavProps) {
  const pathname = usePathname();
  const isJournalRoute = pathname === "/journal"
    || pathname.startsWith("/journal/")
    || pathname === "/blog"
    || pathname.startsWith("/blog/");
  const navTone = isJournalRoute ? "quiet" : "default";
  const primaryNavItems = resolvePrimaryNavRoutes(user);
  const homeHref = resolveShellHomeHref();
  const hasPrimaryLinks = primaryNavItems.length > 0;
  const getNavItemClassName = (isActive: boolean) =>
    `focus-ring shell-nav-label inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-full px-(--space-rail-item-inline) py-(--space-rail-item-block) uppercase transition-all ${
      isActive
        ? "ui-shell-nav-item-active"
        : "ui-shell-nav-item-idle hover:text-foreground hover:bg-background/52"
    }`;

  return (
    <nav
      className="ui-shell-rail ui-shell-rail-safe-top sticky top-0 z-50 transition-colors duration-500"
      aria-label="Primary"
      data-shell-nav-rail="true"
      data-shell-nav-tone={navTone}
    >
      <div className="site-container relative shell-nav-frame">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-(--space-16) bottom-0 h-px bg-linear-to-r from-transparent via-foreground/8 to-transparent" />
        <div className="flex items-center gap-(--space-rail-gap) max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:gap-x-(--space-rail-gap) max-sm:gap-y-(--space-2)">
          <div className="shrink-0" data-shell-nav-region="brand">
            <ShellBrand href={homeHref} />
          </div>

          <div className="mx-auto flex min-w-0 flex-1 items-center px-(--space-2) max-sm:order-3 max-sm:col-span-2 max-sm:px-0" data-shell-nav-region="search">
            <div className="mx-auto w-full max-w-5xl">
              <GlobalSearchBar user={user} searchAction={searchAction} />
            </div>
          </div>

          <div className="shrink-0 justify-self-end" data-shell-nav-region="account-access">
            <AccountMenu user={user} />
          </div>
        </div>

        {hasPrimaryLinks ? (
          <div className="min-w-0 pt-(--space-1)" data-shell-nav-region="primary-links">
            <ul
              className="ui-shell-nav-links flex min-w-0 items-center justify-center overflow-x-auto rounded-full max-sm:justify-start"
              aria-label="Primary links"
              data-shell-nav-links-tone={navTone}
            >
              {primaryNavItems.map((item) => {
                const isActive = isShellRouteActive(item, pathname);

                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      data-shell-nav-item-tone={navTone}
                      className={getNavItemClassName(isActive)}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
