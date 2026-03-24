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
  user: SessionUser;
}

const ROLE_CONFIG: Record<
  RoleName,
  { label: string; dot: string; description: string }
> = {
  ANONYMOUS: {
    label: "Anonymous",
    dot: "bg-zinc-400",
    description: "Public visitor — sales agent mode",
  },
  AUTHENTICATED: {
    label: "Authenticated",
    dot: "bg-status-success",
    description: "Signed-in user — full library access",
  },
  APPRENTICE: {
    label: "Apprentice",
    dot: "bg-emerald-500",
    description: "Student — referral and assignment capabilities",
  },
  STAFF: {
    label: "Staff",
    dot: "bg-blue-500",
    description: "Staff analyst — user insights & KPIs",
  },
  ADMIN: {
    label: "Admin",
    dot: "bg-purple-500",
    description: "Admin — global configuration access",
  },
};

const SettingBlock = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-2">
    <div className="shell-micro-text ml-1 opacity-60">
      {label}
    </div>
    <div className="shell-action-row rounded-theme border-theme bg-surface-muted p-1">
      {children}
    </div>
  </div>
);

const ControlButton = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    className={`shell-micro-text flex-1 rounded-lg py-1.5 transition-all focus-ring ${
      active
        ? "bg-surface text-accent shadow-sm scale-[1.02]"
        : "opacity-40 hover:opacity-100"
    }`}
  >
    {label}
  </button>
);

const DarkModeButton = ({ isDark, onClick }: { isDark: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`focus-ring shell-account-trigger flex h-10 w-10 items-center justify-center rounded-full transition-all ${isDark ? "accent-fill shadow-[0_10px_18px_-18px_color-mix(in_srgb,var(--shadow-base)_18%,transparent)]" : "bg-transparent text-foreground/62 hover:bg-[color-mix(in_oklab,var(--surface)_82%,transparent)] hover:text-foreground"}`}
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

export function AccountMenu({ user }: AccountMenuProps) {
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
  const isDevMode = process.env.NODE_ENV === "development";
  const canSimulate = user.roles.includes("ADMIN") || isDevMode;

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

  // Unauthenticated: show sign in / register links instead of menu
  if (!isAuth) {
    return (
      <div className="flex flex-nowrap items-center justify-end gap-(--shell-account-rail-gap) whitespace-nowrap" data-shell-account-rail="anonymous">
        <DarkModeButton isDark={isDark} onClick={() => setIsDark(!isDark)} />
        <Link
          href="/login"
          className="focus-ring shell-account-trigger shell-account-label whitespace-nowrap bg-transparent px-(--phi-2) py-(--phi-2) text-foreground/62 transition-all hover:bg-[color-mix(in_oklab,var(--surface)_82%,transparent)] hover:text-foreground"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="focus-ring shell-account-trigger shell-account-label whitespace-nowrap accent-fill shadow-[0_10px_18px_-18px_color-mix(in_srgb,var(--shadow-base)_18%,transparent)] transition-all hover:-translate-y-px hover:opacity-95"
        >
          Register
        </Link>
      </div>
    );
  }

  const menuTrigger = (
    <button
      onClick={() => setOpen(!open)}
      className="group shell-account-trigger rounded-full bg-[color-mix(in_oklab,var(--surface)_82%,transparent)] transition-all hover:bg-[color-mix(in_oklab,var(--surface)_90%,var(--background))] focus-ring"
      aria-expanded={open}
      aria-haspopup="menu"
    >
      <div className="hidden min-w-0 flex-col items-end md:flex">
        <span className="shell-account-label truncate leading-none text-foreground/78">{user.name}</span>
        <span className="shell-micro-text opacity-40">
          {user.roles[0]}
        </span>
      </div>
      <div className="shell-account-avatar rounded-full bg-surface font-bold group-hover:bg-surface-hover transition-colors shadow-[0_8px_16px_-14px_color-mix(in_srgb,var(--shadow-base)_10%,transparent)]">
        {initials}
      </div>
    </button>
  );

  return (
    <div ref={ref} className="relative" data-shell-account-rail="authenticated">
      {menuTrigger}

      {open && (
        <div className="absolute right-0 top-[calc(100%+var(--phi-1))] z-100 w-[min(var(--shell-dropdown-width),calc(100vw-var(--phi-1p)))] max-w-[calc(100vw-var(--phi-0))] rounded-3xl border-theme bg-background shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-(--phi-1) flex flex-col gap-(--phi-2) animate-in fade-in slide-in-from-top-4 duration-500 spring-bounce shadow-bloom">
          
          {/* Header: Identity & Quick Toggles */}
          <div className="px-(--shell-dropdown-section-padding-inline) py-(--shell-dropdown-section-padding-block) flex items-center justify-between border-b border-border mb-(--phi-3) bg-surface-muted rounded-t-2xl">
            <div className="min-w-0">
              <p className="shell-panel-heading truncate">{user.name}</p>
              <p className="shell-meta-text truncate opacity-50 normal-case tracking-[0.04em]">{user.email}</p>
            </div>
            <div className="shell-action-row rounded-theme border-theme bg-background p-1 shadow-inner">
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-1.5 rounded-lg transition-all focus-ring ${isDark ? "accent-fill" : "opacity-40 hover:opacity-100"}`}
                title="Toggle Dark Mode"
                aria-label="Toggle dark mode"
              >
                {isDark ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="1" y1="12" x2="3" y2="12" /></svg>}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-(--phi-4) px-(--shell-dropdown-section-padding-inline)">
            {accountMenuRoutes.map((route) => {
              const isActive = pathname === route.href;

              return (
                <Link
                  key={route.id}
                  href={route.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`shell-account-label flex items-center gap-(--phi-3) rounded-theme px-(--shell-dropdown-section-padding-inline) py-(--phi-2) transition-all haptic-press hover-surface focus-ring ${isActive ? "bg-accent/10 text-accent" : ""}`}
                >
                  {route.label}
                </Link>
              );
            })}
          </div>

          <div className="h-px bg-border mx-(--phi-3) my-(--phi-3)" />

          {/* System Legibility Accordion */}
          <div className="flex flex-col">
            <button
              onClick={() => setShowAccessibility(!showAccessibility)}
              className={`shell-account-label flex items-center justify-between rounded-theme px-(--shell-dropdown-section-padding-inline) py-(--phi-2) transition-all hover-surface focus-ring ${showAccessibility ? "bg-surface-muted" : ""}`}
            >
              System Legibility
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform duration-300 ${showAccessibility ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
            </button>
            {showAccessibility && (
              <div className="px-(--shell-dropdown-section-padding-inline) py-(--phi-0) flex flex-col gap-(--phi-0) animate-in fade-in slide-in-from-top-2">
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
              className={`shell-account-label flex items-center justify-between rounded-theme px-(--shell-dropdown-section-padding-inline) py-(--phi-2) transition-all hover-surface focus-ring ${showSimulation ? "bg-surface-muted" : ""}`}
            >
              Simulation Mode
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform duration-300 ${showSimulation ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
            </button>
            {showSimulation && (
              <div className="px-(--shell-dropdown-section-padding-inline) py-(--phi-1) flex flex-col gap-(--phi-3) animate-in fade-in slide-in-from-top-2">
                {(Object.entries(ROLE_CONFIG) as [RoleName, typeof ROLE_CONFIG[RoleName]][]).map(([role, config]) => (
                  <button
                    key={role}
                    onClick={() => switchRole(role)}
                    className={`focus-ring flex min-h-11 w-full items-start gap-(--phi-1) rounded-theme px-(--shell-dropdown-section-padding-inline) py-(--phi-2) text-left transition-all haptic-press hover-surface ${user.roles.includes(role) ? "bg-surface-muted ring-1 ring-border" : ""}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${config.dot} mt-1.5 shrink-0`} />
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

          <div className="h-px bg-border mx-(--phi-3) my-(--phi-3)" />

          <button
            onClick={logout}
            className="shell-section-heading w-full py-(--phi-2) text-center opacity-60 transition-opacity hover:opacity-100 focus-ring"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
