"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ShellBrand } from "@/components/shell/ShellBrand";
import {
  isShellRouteActive,
  resolvePrimaryNavRoutes,
  resolveShellHomeHref,
} from "@/lib/shell/shell-navigation";

import { AccountMenu } from "./AccountMenu";
import type { User as SessionUser } from "@/core/entities/user";

interface SiteNavProps {
  user: SessionUser;
}

export function SiteNav({ user }: SiteNavProps) {
  const pathname = usePathname();
  const primaryNavItems = resolvePrimaryNavRoutes(user);
  const homeHref = resolveShellHomeHref();
  const hasPrimaryLinks = primaryNavItems.length > 0;
  const railLayoutClasses = hasPrimaryLinks
    ? "grid shell-nav-frame grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-(--shell-rail-gap) max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:grid-rows-[auto_auto]"
    : "flex shell-nav-frame items-center justify-between gap-(--shell-rail-gap)";

  return (
    <nav
      className="glass-surface sticky top-0 z-50 pt-[max(0px,var(--safe-area-inset-top))] shadow-[0_8px_20px_color-mix(in_srgb,var(--shadow-base)_4%,transparent)] transition-colors duration-500"
      aria-label="Primary"
      data-shell-nav-rail="true"
    >
      <div className={`site-container relative ${railLayoutClasses}`}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-16 bottom-0 h-px bg-linear-to-r from-transparent via-foreground/8 to-transparent" />
        <div className="min-w-0 flex items-center justify-start" data-shell-nav-region="brand">
          <ShellBrand href={homeHref} className="opacity-90" />
        </div>

        {hasPrimaryLinks ? (
          <div className="min-w-0 justify-self-center max-sm:order-3 max-sm:col-span-2 max-sm:justify-self-start" data-shell-nav-region="primary-links">
            <ul className="flex min-w-0 items-center justify-center gap-(--shell-nav-item-gap) overflow-x-auto rounded-full bg-[color-mix(in_oklab,var(--surface)_72%,transparent)] px-(--phi-2) py-[0.28rem] max-sm:justify-start" aria-label="Primary links">
              {primaryNavItems.map((item) => {
                const isActive = isShellRouteActive(item, pathname);

                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`focus-ring shell-nav-label inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-full px-(--shell-nav-item-padding-inline) py-(--shell-nav-item-padding-block) uppercase transition-all ${
                        isActive
                          ? "bg-[color-mix(in_oklab,var(--foreground)_4%,var(--surface))] text-foreground"
                          : "text-foreground/56 hover:text-foreground hover:bg-background/52"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className={`${hasPrimaryLinks ? "col-start-3 justify-self-end max-sm:col-start-2 max-sm:row-start-1" : "shrink-0"} min-w-0 flex items-center justify-end`} data-shell-nav-region="account-access">
          <AccountMenu user={user} />
        </div>
      </div>
    </nav>
  );
}
