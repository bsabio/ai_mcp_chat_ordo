"use client";

import React, { useEffect, useState } from "react";
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

export function SiteNav({ user, searchAction }: SiteNavProps) {
  const pathname = usePathname();
  const [showDesktopSearch, setShowDesktopSearch] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return true;
    }

    return window.matchMedia("(min-width: 56rem)").matches;
  });
  const isJournalRoute = pathname === "/journal"
    || pathname.startsWith("/journal/")
    || pathname === "/blog"
    || pathname.startsWith("/blog/");
  const navTone = isJournalRoute ? "quiet" : "default";
  const homeHref = resolveShellHomeHref();

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 56rem)");
    const syncSearchVisibility = () => setShowDesktopSearch(mediaQuery.matches);

    syncSearchVisibility();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncSearchVisibility);
      return () => mediaQuery.removeEventListener("change", syncSearchVisibility);
    }

    mediaQuery.addListener(syncSearchVisibility);
    return () => mediaQuery.removeListener(syncSearchVisibility);
  }, []);

  const showSearch = showDesktopSearch;

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

          {showSearch ? (
            <div className="shell-nav-search-region" data-shell-nav-region="search">
              <div className="shell-nav-search-frame">
                <GlobalSearchBar user={user} searchAction={searchAction} />
              </div>
            </div>
          ) : null}

          <div
            className="shell-nav-actions"
            data-shell-nav-region="account-access"
          >
            <NotificationFeed user={user} />
            <ShellWorkspaceMenu user={user} tone={navTone} />
          </div>
        </div>
      </div>
    </nav>
  );
}
