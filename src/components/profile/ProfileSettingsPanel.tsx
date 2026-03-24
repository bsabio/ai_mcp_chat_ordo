"use client";

import { useState, useTransition } from "react";

import type { UserProfileViewModel } from "@/lib/profile/types";
import { downloadFileFromUrl } from "@/lib/download-browser";

interface ProfileSettingsPanelProps {
  initialProfile: UserProfileViewModel;
}

type SaveState =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function ProfileSettingsPanel({ initialProfile }: ProfileSettingsPanelProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [name, setName] = useState(initialProfile.name);
  const [email, setEmail] = useState(initialProfile.email);
  const [credential, setCredential] = useState(initialProfile.credential);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveState({ kind: "idle" });

    startTransition(async () => {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, credential }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { profile?: UserProfileViewModel; error?: string }
        | null;

      if (!response.ok || !payload?.profile) {
        setSaveState({
          kind: "error",
          message: payload?.error ?? "Unable to update your profile right now.",
        });
        return;
      }

      setProfile(payload.profile);
      setName(payload.profile.name);
      setEmail(payload.profile.email);
      setCredential(payload.profile.credential);
      setSaveState({ kind: "success", message: "Profile updated." });
    });
  };

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setSaveState({ kind: "success", message: `${label} copied.` });
    } catch {
      setSaveState({ kind: "error", message: `Unable to copy ${label.toLowerCase()}.` });
    }
  };

  const handleDownloadQr = () => {
    if (!profile.qrCodeUrl || !profile.referralCode) {
      return;
    }

    downloadFileFromUrl(profile.qrCodeUrl, `referral-${profile.referralCode}.png`);
    setSaveState({ kind: "success", message: "Referral QR download started." });
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-(--container-padding) py-10 sm:py-14">
      <header className="flex flex-col gap-3">
        <p className="theme-label tier-micro uppercase text-foreground/42">Account</p>
        <h1 className="theme-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Profile
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/62 sm:text-base">
          Keep your public referral details current and make sure the AI and your profile page are working from the same account information.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <section className="rounded-[1.75rem] border border-border/70 bg-surface/80 p-6 shadow-[0_24px_60px_-42px_color-mix(in_srgb,var(--shadow-base)_18%,transparent)] backdrop-blur-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="theme-display text-xl font-semibold tracking-tight">Profile details</h2>
              <p className="mt-1 text-sm text-foreground/52">
                These values are used by your account surface and by the profile MCP tools.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-foreground/48"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="profile-name" className="form-label">Name</label>
              <input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="input-field"
                autoComplete="name"
                placeholder="Your name"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-email" className="form-label">Email</label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input-field"
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-credential" className="form-label">Credential</label>
              <input
                id="profile-credential"
                value={credential}
                onChange={(event) => setCredential(event.target.value)}
                className="input-field"
                placeholder="Enterprise AI practitioner"
              />
              <p className="text-xs leading-5 text-foreground/45">
                This appears in referral-aware greetings when your referral code is enabled.
              </p>
            </div>

            {saveState.kind !== "idle" ? (
              <div className={saveState.kind === "error" ? "alert-error" : "rounded-theme border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-200"}>
                {saveState.message}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-xs text-foreground/42">Changes save to the same backend used by the chat tools.</p>
              <button type="submit" className="btn-primary" disabled={isPending}>
                {isPending ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
        </section>

        <aside className="rounded-[1.75rem] border border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface)_88%,var(--background))_0%,color-mix(in_oklab,var(--surface-muted)_72%,transparent)_100%)] p-6 shadow-[0_24px_60px_-42px_color-mix(in_srgb,var(--shadow-base)_18%,transparent)]">
          <div className="flex flex-col gap-2">
            <p className="theme-label tier-micro uppercase text-foreground/42">Referral QR</p>
            <h2 className="theme-display text-xl font-semibold tracking-tight">Your share link</h2>
            <p className="text-sm leading-6 text-foreground/56">
              If admin has enabled referrals for your account, your QR code and landing link appear here.
            </p>
          </div>

          {profile.affiliateEnabled && profile.referralCode && profile.qrCodeUrl && profile.referralUrl ? (
            <div className="mt-5 flex flex-col gap-4">
              <div className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-background/90 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.qrCodeUrl}
                  alt={`Referral QR code for ${profile.name}`}
                  className="mx-auto h-auto w-full max-w-56"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-foreground/38">Referral code</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="rounded-md bg-background/80 px-3 py-2 text-sm text-foreground/78">
                      {profile.referralCode}
                    </code>
                    <button
                      type="button"
                      className="focus-ring rounded-full border border-border/70 px-3 py-2 text-xs font-semibold text-foreground/62 transition-colors hover:text-foreground"
                      onClick={() => handleCopy(profile.referralCode!, "Referral code")}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-foreground/38">Referral link</p>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                    <input readOnly value={profile.referralUrl} className="input-field flex-1" />
                    <button
                      type="button"
                      className="focus-ring rounded-full border border-border/70 px-4 py-2 text-xs font-semibold text-foreground/62 transition-colors hover:text-foreground"
                      onClick={() => handleCopy(profile.referralUrl!, "Referral link")}
                    >
                      Copy link
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={handleDownloadQr}>
                  Download QR
                </button>
                <a
                  href={profile.qrCodeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-border/70 px-4 py-2 text-sm font-semibold text-foreground/72 transition-colors hover:text-foreground"
                >
                  Open QR
                </a>
                <a
                  href={profile.referralUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-border/70 px-4 py-2 text-sm font-semibold text-foreground/72 transition-colors hover:text-foreground"
                >
                  Open link
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[1.25rem] border border-dashed border-border/70 bg-background/48 p-5 text-sm leading-6 text-foreground/52">
              Referral access is not enabled for this account yet. Once an administrator enables affiliate status, your QR code will appear here automatically.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}