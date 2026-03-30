"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import type { AccessibilitySettings, FontSize, SpacingLevel } from "./ThemeProvider";
import { resolveAccountMenuRoutes } from "@/lib/shell/shell-navigation";
import { useMockAuth } from "@/hooks/useMockAuth";
import type { User as SessionUser, RoleName } from "@/core/entities/user";

interface AccountMenuProps {
  user?: SessionUser;
  role?: string;
}

const ROLE_CONFIG: Record<
  RoleName,
  { label: string; dot: string; description: string }
> = {
  ANONYMOUS: {
    label: "Anonymous",
    dot: "bg-[color:color-mix(in_oklab,var(--foreground)_38%,transparent)]",
    description: "Public visitor — sales agent mode",
  },
  AUTHENTICATED: {
    label: "Authenticated",
    dot: "bg-status-success",
    description: "Signed-in user — full library access",
  },
  APPRENTICE: {
    label: "Apprentice",
    dot: "bg-[color:color-mix(in_oklab,var(--status-success)_72%,var(--accent-interactive))]",
    description: "Student — referral and assignment capabilities",
  },
  STAFF: {
    label: "Staff",
    dot: "bg-[color:color-mix(in_oklab,var(--accent-interactive)_82%,var(--foreground))]",
    description: "Staff analyst — user insights & KPIs",
  },
  ADMIN: {
    label: "Admin",
    dot: "bg-[color:color-mix(in_oklab,var(--status-error)_55%,var(--accent-interactive))]",
    description: "Admin — global configuration access",
  },
};

const SettingBlock = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-(--space-2)">
    <div className="shell-micro-text ml-(--space-1) opacity-60">
      {label}
    </div>
    <div className="ui-shell-setting-row shell-action-row rounded-theme border-theme p-(--space-1)" data-shell-setting-row="true">
      {children}
    </div>
  </div>
);

const ControlButton = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    className={`shell-micro-text flex-1 rounded-lg py-(--space-2) transition-all focus-ring ${
      active
        ? "ui-shell-setting-option-active"
        : "ui-shell-setting-option-idle hover:opacity-100"
    }`}
    data-shell-setting-option={active ? "active" : "idle"}
  >
    {label}
  </button>
);

const DarkModeButton = ({ isDark, onClick }: { isDark: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`focus-ring shell-account-trigger flex h-10 w-10 items-center justify-center rounded-full transition-all ${isDark ? "ui-shell-account-primary-trigger" : "ui-shell-account-ghost-trigger hover:bg-[color-mix(in_oklab,var(--surface)_82%,transparent)] hover:text-foreground"}`}
    title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
  >
    {isDark ? (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
      </svg>
    ) : (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="12" y1="21" x2="12" y2="23" />
      </svg>
    )}
  </button>
);

export function AccountMenu({ user: userProp, role }: AccountMenuProps) {
  const user: SessionUser = userProp ?? {
    id: "",
    email: "",
    name: role === "ADMIN" ? "Admin" : "Guest",
    roles: role ? [role as RoleName] : ["ANONYMOUS"],
  };
  const [open, setOpen] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { switchRole, logout } = useMockAuth();
  const { 
    isDark, 
    setIsDark, 
    accessibility, 
    setAccessibility 
  } = useTheme();

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowAccessibility(false);
        setShowSimulation(false);
      }
    };
    document.addEventListener("pointerdown", onClickOutside);
    return () => document.removeEventListener("pointerdown", onClickOutside);
  }, [open]);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const isAuth = user.roles.some((r) => r !== "ANONYMOUS");
  const isDev = process.env.NODE_ENV === "development";
  const canSimulate = user.roles.includes("ADMIN") || isDev;

  const updateAcc = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K],
  ) => {
    setAccessibility({ ...accessibility, [key]: value });
  };

  const FONT_SIZES: { value: FontSize; label: string }[] = [
    { value: "xs", label: "XS" },
    { value: "sm", label: "S" },
    { value: "md", label: "M" },
    { value: "lg", label: "L" },
    { value: "xl", label: "XL" },
  ];

  const SPACING: { value: SpacingLevel; label: string }[] = [
    { value: "tight", label: "Tight" },
    { value: "normal", label: "Normal" },
    { value: "relaxed", label: "Relaxed" },
  ];
  const accountMenuRoutes = resolveAccountMenuRoutes(user);
  const isAdmin = user.roles.includes("ADMIN");

  // Unauthenticated: show sign in / register links instead of menu
  if (!isAuth) {
    return (
      <div className="flex flex-nowrap items-center justify-end gap-(--space-rail-gap) whitespace-nowrap" data-shell-account-rail="anonymous">
        <DarkModeButton isDark={isDark} onClick={() => setIsDark(!isDark)} />
        <Link
          href="/login"
          className="ui-shell-account-ghost-trigger focus-ring shell-account-trigger shell-account-label whitespace-nowrap px-(--space-2) py-(--space-1) transition-all hover:bg-[color-mix(in_oklab,var(--surface)_82%,transparent)] hover:text-foreground"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="ui-shell-account-primary-trigger focus-ring shell-account-trigger shell-account-label whitespace-nowrap transition-all hover:-translate-y-px hover:opacity-95"
        >
          Register
        </Link>
      </div>
    );
  }

  const menuTrigger = (
    <button
      onClick={() => setOpen(!open)}
      className="ui-shell-account-trigger group shell-account-trigger rounded-full transition-all focus-ring hover:ui-shell-account-trigger-hover"
      aria-expanded={open}
      aria-haspopup="menu"
      data-shell-account-trigger="true"
    >
      <div className="hidden min-w-0 flex-col items-end md:flex">
        <span className="shell-account-label truncate leading-none text-foreground/78">{user.name}</span>
        <span className="shell-micro-text opacity-40">
          {user.roles[0]}
        </span>
      </div>
      <div className="ui-shell-account-avatar shell-account-avatar rounded-full font-bold group-hover:bg-surface-hover transition-colors">
        {initials}
      </div>
    </button>
  );

  return (
    <div ref={ref} className="relative" data-shell-account-rail="authenticated">
      {menuTrigger}

      {/* Admin navigation — always in DOM for screen readers and assistive tools (D10.3) */}
      {isAdmin && (
        <nav aria-label="Admin navigation" className="sr-only">
          {[
            { href: "/admin", label: "Dashboard" },
            { href: "/admin/users", label: "Users" },
            { href: "/admin/leads", label: "Leads" },
            { href: "/admin/conversations", label: "Conversations" },
            { href: "/admin/prompts", label: "Prompts" },
            { href: "/admin/jobs", label: "Jobs" },
            { href: "/admin/system", label: "System" },
            { href: "/admin/journal", label: "Journal" },
          ].map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      )}

      {open && (
        <div className="ui-shell-dropdown ui-shell-dropdown-anchor absolute right-0 z-100 w-[min(20rem,calc(100vw-var(--space-6)))] max-w-[calc(100vw-var(--space-4))] rounded-3xl p-(--space-inset-compact) flex flex-col gap-(--space-2) animate-in fade-in slide-in-from-top-4 duration-500 spring-bounce shadow-bloom" data-shell-dropdown="true">
          
          {/* Header: Identity & Quick Toggles */}
          <div className="ui-shell-dropdown-header px-(--space-inset-default) py-(--space-inset-compact) flex items-center justify-between mb-(--space-2) rounded-t-2xl">
            <div className="min-w-0">
              <p className="shell-panel-heading truncate">{user.name}</p>
              <p className="shell-meta-text truncate opacity-50 normal-case tracking-[0.04em]">{user.email}</p>
            </div>
            <div className="ui-shell-control-cluster shell-action-row rounded-theme border-theme p-(--space-1) shadow-inner">
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-(--space-2) rounded-lg transition-all focus-ring ${isDark ? "accent-interactive-fill" : "opacity-40 hover:opacity-100"}`}
                title="Toggle Dark Mode"
                aria-label="Toggle dark mode"
              >
                {isDark ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="1" y1="12" x2="3" y2="12" /></svg>}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-(--space-1) px-(--space-inset-default)">
            {accountMenuRoutes.map((route) => {
              const isActive = pathname === route.href;

              return (
                <Link
                  key={route.id}
                  href={route.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`shell-account-label flex items-center gap-(--space-2) rounded-theme px-(--space-inset-default) py-(--space-1) transition-all haptic-press hover-surface focus-ring ${isActive ? "ui-shell-menu-link-active" : ""}`}
                >
                  {route.label}
                </Link>
              );
            })}
          </div>

          {/* Admin section — visible only to ADMIN users (D10.3) */}
          {isAdmin && (
            <>
              <div className="ui-shell-divider h-px mx-(--space-2) my-(--space-1)" />
              <div className="px-(--space-inset-default) flex flex-col gap-(--space-1)">
                <p className="shell-micro-text ml-(--space-1) opacity-60">Admin</p>
                {[
                  { href: "/admin", label: "Dashboard" },
                  { href: "/admin/users", label: "Users" },
                  { href: "/admin/leads", label: "Leads" },
                  { href: "/admin/conversations", label: "Conversations" },
                  { href: "/admin/prompts", label: "Prompts" },
                  { href: "/admin/jobs", label: "Jobs" },
                  { href: "/admin/system", label: "System" },
                  { href: "/admin/journal", label: "Journal" },
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="shell-account-label flex items-center gap-(--space-2) rounded-theme px-(--space-inset-default) py-(--space-1) transition-all haptic-press hover-surface focus-ring"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </>
          )}

          <div className="ui-shell-divider h-px mx-(--space-2) my-(--space-2)" />

          {/* System Legibility Accordion */}
          <div className="flex flex-col">
            <button
              onClick={() => setShowAccessibility(!showAccessibility)}
              className={`shell-account-label flex items-center justify-between rounded-theme px-(--space-inset-default) py-(--space-2) transition-all hover-surface focus-ring ${showAccessibility ? "ui-shell-accordion-active" : ""}`}
            >
              System Legibility
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform duration-300 ${showAccessibility ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
            </button>
            {showAccessibility && (
              <div className="px-(--space-inset-default) py-(--space-4) flex flex-col gap-(--space-4) animate-in fade-in slide-in-from-top-2">
                <SettingBlock label="Type Scale">
                  {FONT_SIZES.map((fs) => (
                    <ControlButton key={fs.value} label={fs.label} active={accessibility.fontSize === fs.value} onClick={() => updateAcc("fontSize", fs.value)} />
                  ))}
                </SettingBlock>
                <SettingBlock label="Line Height">
                  {SPACING.map((s) => (
                    <ControlButton key={s.value} label={s.label} active={accessibility.lineHeight === s.value} onClick={() => updateAcc("lineHeight", s.value)} />
                  ))}
                </SettingBlock>
                <SettingBlock label="Tracking">
                  {SPACING.map((s) => (
                    <ControlButton key={s.value} label={s.label} active={accessibility.letterSpacing === s.value} onClick={() => updateAcc("letterSpacing", s.value)} />
                  ))}
                </SettingBlock>
              </div>
            )}
          </div>

          {/* Simulation Mode Accordion — ADMIN or dev mode only */}
          {canSimulate && (
          <div className="flex flex-col">
            <button
              onClick={() => setShowSimulation(!showSimulation)}
              className={`shell-account-label flex items-center justify-between rounded-theme px-(--space-inset-default) py-(--space-2) transition-all hover-surface focus-ring ${showSimulation ? "ui-shell-accordion-active" : ""}`}
            >
              Simulation Mode
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform duration-300 ${showSimulation ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
            </button>
            {showSimulation && (
              <div className="px-(--space-inset-default) py-(--space-3) flex flex-col gap-(--space-2) animate-in fade-in slide-in-from-top-2">
                {(Object.entries(ROLE_CONFIG) as [RoleName, typeof ROLE_CONFIG[RoleName]][]).map(([role, config]) => (
                  <button
                    key={role}
                    onClick={() => switchRole(role)}
                    className={`focus-ring flex min-h-11 w-full items-start gap-(--space-2) rounded-theme px-(--space-inset-default) py-(--space-1) text-left transition-all haptic-press hover-surface ${user.roles.includes(role) ? "ui-shell-simulation-active" : ""}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${config.dot} mt-(--space-2) shrink-0`} />
                    <div className="min-w-0">
                      <p className="shell-account-label leading-tight">{config.label}</p>
                      <p className="shell-nav-label truncate opacity-60">{config.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          <div className="ui-shell-divider h-px mx-(--space-2) my-(--space-2)" />

          <button
            onClick={logout}
            className="shell-section-heading w-full py-(--space-1) text-center opacity-60 transition-opacity hover:opacity-100 focus-ring"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
