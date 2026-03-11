"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { useMockAuth } from "@/hooks/useMockAuth";

// --- Components ---

const DashboardCard = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  children, 
  className = "" 
}: { 
  title: string; 
  subtitle: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`rounded-[32px] border-theme bg-[var(--background)] p-6 shadow-bloom flex flex-col gap-4 transition-all hover:scale-[1.01] hover:shadow-2xl group ${className}`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[var(--surface-muted)] flex items-center justify-center text-[var(--accent-color)] group-hover:bg-[var(--accent-color)] group-hover:text-[var(--accent-foreground)] transition-all">
          {Icon}
        </div>
        <div>
          <h3 className="text-sm font-black tracking-tight uppercase leading-none">{title}</h3>
          <p className="text-label opacity-40 mt-1">{subtitle}</p>
        </div>
      </div>
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
    </div>
    <div className="flex-1 flex flex-col gap-4">
      {children}
    </div>
  </div>
);

const SettingRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30 ml-1">{label}</label>
    <div className="flex p-1 bg-[var(--surface-muted)] rounded-xl gap-1 border-theme">
      {children}
    </div>
  </div>
);

const PillButton = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all haptic-press ${
      active
        ? "bg-[var(--background)] text-[var(--accent-color)] shadow-sm scale-[1.02] border-theme"
        : "opacity-30 hover:opacity-100 hover-surface"
    }`}
  >
    {label}
  </button>
);

// --- Page ---

export default function DashboardPage() {
  const { 
    gridEnabled, 
    setGridEnabled, 
    isDark, 
    setIsDark, 
    accessibility, 
    setAccessibility,
    theme,
    setTheme
  } = useTheme();
  const { switchRole, localRole, ROLE_CONFIG } = useMockAuth();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="flex-1 w-full bg-[var(--background)] overflow-y-auto overflow-x-hidden relative flex flex-col min-h-0 custom-scrollbar p-6 lg:p-12">
      <div className="mx-auto w-full max-w-[var(--container-width)] flex flex-col gap-12">
        
        {/* Page Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="accent-fill px-2 py-0.5 rounded text-label font-black shadow-sm">
                System Authorized
              </div>
              <span className="text-label opacity-30">/ Ordo Command Center</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none italic uppercase">
              Business <span className="text-[var(--accent-color)]">Operations</span>
            </h1>
            <p className="text-sm font-medium opacity-50 max-w-xl">
              A high-fidelity conceptual mission control for architectural governance. Organize design physics, market simulations, and engineering health in one contextual bento grid.
            </p>
          </div>
          <Link 
            href="/"
            className="haptic-press bg-[var(--foreground)] text-[var(--background)] px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
          >
            Return to Frontline
          </Link>
        </header>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[minmax(320px,auto)]">
          
          {/* Pillar 1: Engineering Operations */}
          <DashboardCard 
            title="Engineering Ops" 
            subtitle="Health & Connectivity"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>}
          >
            <div className="flex flex-col gap-4 mt-2">
              <div className="bg-[var(--surface-muted)] rounded-2xl p-4 border-theme">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-label opacity-40">System Readiness</span>
                  <span className="text-label text-emerald-500">Operational</span>
                </div>
                <div className="flex gap-1 h-1.5">
                  <div className="flex-1 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                  <div className="flex-1 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                  <div className="flex-1 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                  <div className="flex-1 bg-[var(--surface-muted)] rounded-full" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[var(--surface-muted)] rounded-xl border-theme">
                  <p className="text-[9px] font-bold opacity-50 uppercase mb-1">Response Time</p>
                  <p className="text-lg font-black tracking-tighter">12ms</p>
                </div>
                <div className="p-3 bg-[var(--surface-muted)] rounded-xl border-theme">
                  <p className="text-[9px] font-bold opacity-50 uppercase mb-1">Active Memory</p>
                  <p className="text-lg font-black tracking-tighter">1.2GB</p>
                </div>
              </div>

              <button className="mt-auto w-full py-2.5 rounded-xl bg-[var(--surface-muted)] border-theme text-label font-black hover:bg-[var(--accent-color)] hover:text-white transition-all">
                Run Diagnostics Sweep
              </button>
            </div>
          </DashboardCard>

          {/* Pillar 2: Design Integrity (Sandbox Migration) */}
          <DashboardCard 
            title="Design Integrity" 
            subtitle="Physics & Legibility"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M2 12h20M12 12l7.07-7.07M12 12l-7.07 7.07M12 12l-7.07-7.07M12 12l7.07 7.07"/></svg>}
            className="lg:col-span-2"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-2">
              <div className="flex flex-col gap-5">
                <div className="text-label font-black opacity-50 border-b border-[var(--border-color)] pb-2">Physics Lab</div>
                <SettingRow label="Type Scale">
                  {(["xs", "sm", "md", "lg", "xl"] as const).map((s) => (
                    <PillButton key={s} label={s.toUpperCase()} active={accessibility.fontSize === s} onClick={() => setAccessibility({ ...accessibility, fontSize: s })} />
                  ))}
                </SettingRow>
                <SettingRow label="Inter-line Spacing">
                  {(["tight", "normal", "relaxed"] as const).map((s) => (
                    <PillButton key={s} label={s.toUpperCase()} active={accessibility.lineHeight === s} onClick={() => setAccessibility({ ...accessibility, lineHeight: s })} />
                  ))}
                </SettingRow>
                <SettingRow label="Chronological Era">
                  {(["fluid", "bauhaus", "swiss", "postmodern", "skeuomorphic"] as const).map((t) => (
                    <PillButton key={t} label={t.substring(0, 3).toUpperCase()} active={theme === t} onClick={() => setTheme(t)} />
                  ))}
                </SettingRow>
              </div>

              <div className="flex flex-col gap-4">
                <div className="text-label font-black opacity-50 border-b border-[var(--border-color)] pb-2">Layout Tokens</div>
                <div className="flex-1 rounded-2xl border-theme bg-[var(--surface-muted)] p-4 flex flex-col justify-center gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-label opacity-40">
                      <span>Border Tension</span>
                      <span>8px</span>
                    </div>
                    <div className="h-1 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--accent-color)] w-1/4 rounded-full" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-label opacity-40">
                      <span>Chromatic Hue</span>
                      <span>220°</span>
                    </div>
                    <div className="h-1 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--accent-color)] w-3/5 rounded-full" />
                    </div>
                  </div>
                  <div className="mt-4 p-4 rounded-xl border-2 border-[var(--accent-color)] border-dashed text-center opacity-40">
                    <p className="text-label font-black tracking-[0.2em]">High-Fidelity Preview Area</p>
                  </div>
                </div>
              </div>
            </div>
          </DashboardCard>

          {/* Pillar 3: Product Metrics */}
          <DashboardCard 
            title="Product Strategy" 
            subtitle="KPIs & Roadmap"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>}
          >
            <div className="flex flex-col gap-4 mt-2 h-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold opacity-60">Sprint Velocity</span>
                  <span className="text-xs font-black">42.8 pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold opacity-60">User Retention</span>
                  <span className="text-xs font-black">84%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold opacity-60">Churn Risk</span>
                  <span className="text-xs font-black text-emerald-500">LOW</span>
                </div>
              </div>
              <div className="mt-auto p-4 rounded-2xl bg-[var(--accent-color)]/5 border border-[var(--accent-color)]/10">
                <p className="text-label font-black text-[var(--accent-color)] mb-2">Next Milestone</p>
                <p className="text-sm font-black tracking-tight leading-tight">Project "Hyperion" Launch</p>
                <p className="text-[10px] opacity-40 font-bold mt-1">In 14 days — Governance Ready</p>
              </div>
            </div>
          </DashboardCard>

          {/* Pillar 4: Revenue & Growth (Simulation) */}
          <DashboardCard 
            title="Revenue Personas" 
            subtitle="Market Simulation"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          >
             <div className="flex flex-col gap-1.5 mt-2">
                {(Object.entries(ROLE_CONFIG) as [any, any][]).map(([role, config]) => (
                  <button
                    key={role}
                    onClick={() => switchRole(role)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all haptic-press hover-surface border border-transparent ${localRole === role ? "bg-[var(--surface-muted)] border-[var(--border-color)] ring-1 ring-[var(--border-color)]" : ""}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${config.dot} shrink-0`} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-black leading-tight uppercase tracking-tight">{config.label}</p>
                      <p className="text-[9px] opacity-40 truncate font-bold">{config.description}</p>
                    </div>
                    {localRole === role && <span className="ml-auto text-emerald-500 text-[10px]">●</span>}
                  </button>
                ))}
            </div>
            <p className="text-[9px] opacity-30 font-bold italic mt-2 px-2 text-center">
              Switching personas alters the AI's response strategy and content visibility in real-time.
            </p>
          </DashboardCard>

          <div className="rounded-[40px] accent-fill p-12 flex flex-col justify-center items-center text-center gap-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center text-3xl font-black">?</div>
            <div>
              <h3 className="text-2xl font-black tracking-tighter uppercase italic leading-none">Custom<br/>Pillars</h3>
              <p className="text-xs font-bold opacity-60 mt-4 uppercase tracking-widest italic">Orchestration<br/>Module v1.0</p>
            </div>
            <button className="px-6 py-2 rounded-full border-2 border-current text-label font-black tracking-[0.3em] hover:bg-white hover:text-[var(--accent-color)] transition-all">Expand Board</button>
          </div>

        </div>

        {/* Footer info */}
        <footer className="mt-12 pt-12 border-t border-[var(--border-color)] flex flex-col md:flex-row justify-between items-center gap-6 opacity-60">
          <p className="text-label">© 2026 Ordo Intelligence • Security Level 4 • All Systems Nominal</p>
          <div className="flex gap-8">
             <span className="text-label font-black cursor-default hover:text-[var(--accent-color)] transition-all">Privacy Contract</span>
             <span className="text-label font-black cursor-default hover:text-[var(--accent-color)] transition-all">Terms of Governance</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
