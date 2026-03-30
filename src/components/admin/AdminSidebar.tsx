"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { resolveAdminNavigationItems } from "@/lib/admin/admin-navigation";

export function AdminSidebar() {
  const pathname = usePathname();
  const navItems = resolveAdminNavigationItems();

  return (
    <aside
      aria-label="Admin"
      className="jobs-panel-surface sticky top-(--space-frame-default) hidden max-h-[calc(var(--viewport-block-size)-var(--space-frame-default)*2)] flex-col gap-(--space-stack-default) overflow-y-auto p-(--space-inset-panel) sm:flex"
    >
      <div className="grid gap-(--space-3)">
        <div className="grid gap-(--space-2)">
          <p className="shell-section-heading text-foreground/46">Admin workspace</p>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Admin</h1>
        </div>
        <p className="text-sm leading-6 text-foreground/62">
          Queue health, editorial operations, and upcoming operator surfaces live here without the public marketing chrome.
        </p>
      </div>
      <nav className="grid gap-(--space-2)">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.status === "preview" ? `${item.label} preview` : item.label}
              className={`rounded-[1.2rem] px-(--space-inset-default) py-(--space-inset-compact) text-sm font-medium transition-all ${isActive ? "bg-foreground text-background shadow-[0_18px_30px_-24px_color-mix(in_srgb,var(--shadow-base)_34%,transparent)]" : "text-foreground/72 hover:bg-foreground/4 hover:text-foreground"}`}
              data-admin-nav-status={item.status}
            >
              <span className="flex items-center justify-between gap-(--space-cluster-default)">
                <span>{item.label}</span>
                {item.status === "preview" ? (
                  <span className={`rounded-full border px-(--space-2) py-[0.1rem] text-[0.62rem] font-semibold uppercase tracking-[0.12em] ${isActive ? "border-background/30 text-background/78" : "border-amber-500/30 text-amber-300"}`}>
                    Preview
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}