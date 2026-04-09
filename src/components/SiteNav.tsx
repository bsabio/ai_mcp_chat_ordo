"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ShellBrand } from "@/components/shell/ShellBrand";
import { GlobalSearchBar } from "@/components/GlobalSearchBar";
import { NotificationFeed } from "@/components/NotificationFeed";
import { ShellWorkspaceMenu } from "@/components/ShellWorkspaceMenu";
import {
  resolveShellHomeHref,
} from "@/lib/shell/shell-navigation";
import type { GlobalSearchAction } from "@/lib/search/global-search";
import type { User as SessionUser } from "@/core/entities/user";

interface SiteNavProps {
  user: SessionUser;
  searchAction?: GlobalSearchAction;
}

const GUEST_ACCESS_LINKS = [
  { href: "/login", label: "Login" },
  { href: "/register", label: "Register" },
] as const;

export function SiteNav({ user, searchAction }: SiteNavProps) {
  const pathname = usePathname();
  const isJournalRoute = pathname === "/journal"
    || pathname.startsWith("/journal/");
  const navTone = isJournalRoute ? "quiet" : "default";
  const homeHref = resolveShellHomeHref();
  const isAnonymous = user.roles.every((role) => role === "ANONYMOUS");

  return (
    <nav
      className="ui-shell-rail ui-shell-rail-safe-top sticky top-0 z-50 transition-colors duration-500"
      aria-label="Primary"
      data-shell-nav-rail="true"
      data-shell-nav-tone={navTone}
    >
      <div
        className="site-container relative mx-auto w-full shell-nav-frame"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-(--space-16) bottom-0 h-px bg-linear-to-r from-transparent via-foreground/8 to-transparent" />
        <div
          className="shell-nav-band"
          data-shell-nav-band="true"
        >
          <div className="shell-nav-brand-region" data-shell-nav-region="brand">
            <div className="shell-action-row">
              <ShellBrand href={homeHref} compactOnMobile />
            </div>
          </div>

          <div className="shell-nav-search-region" data-shell-nav-region="search">
            <div className="shell-nav-search-frame">
              <GlobalSearchBar user={user} searchAction={searchAction} />
            </div>
          </div>

          <div
            className="shell-nav-actions"
            data-shell-nav-region="account-access"
          >
            {isAnonymous ? (
              <div className="shell-action-row" data-shell-nav-guest-access="true">
                {GUEST_ACCESS_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="shell-nav-icon-button shell-micro-text min-w-21 justify-center rounded-full px-(--space-3)"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : (
              <NotificationFeed user={user} />
            )}
            <ShellWorkspaceMenu user={user} tone={navTone} />
          </div>
        </div>
      </div>
    </nav>
  );
}
