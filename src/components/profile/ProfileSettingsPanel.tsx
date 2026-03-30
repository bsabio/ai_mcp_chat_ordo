"use client";

import { useState, useTransition } from "react";

import type { UserProfileViewModel } from "@/lib/profile/types";
import { downloadFileFromUrl } from "@/lib/download-browser";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationsUnavailableReason,
} from "@/lib/push/browser-push";

interface ProfileSettingsPanelProps {
  initialProfile: UserProfileViewModel;
}

type SaveState =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function getProfileNoticeClassName(kind: SaveState["kind"]): string {
  return kind === "error" ? "alert-error" : "profile-success-notice px-(--space-inset-default) py-(--space-inset-compact) text-sm";
}

export function ProfileSettingsPanel({ initialProfile }: ProfileSettingsPanelProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [name, setName] = useState(initialProfile.name);
  const [email, setEmail] = useState(initialProfile.email);
  const [credential, setCredential] = useState(initialProfile.credential);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [pushState, setPushState] = useState<SaveState>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const [isPushPending, startPushTransition] = useTransition();
  const pushUnavailableReason = getPushNotificationsUnavailableReason();
  const referralCode = profile.referralCode;
  const referralUrl = profile.referralUrl;

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

  const handlePushNotificationsToggle = () => {
    setPushState({ kind: "idle" });

    startPushTransition(async () => {
      try {
        if (profile.pushNotificationsEnabled) {
          await disablePushNotifications();
          setProfile((current) => ({
            ...current,
            pushNotificationsEnabled: false,
          }));
          setPushState({
            kind: "success",
            message: "Push notifications disabled for your account.",
          });
          return;
        }

        await enablePushNotifications();
        setProfile((current) => ({
          ...current,
          pushNotificationsEnabled: true,
        }));
        setPushState({
          kind: "success",
          message: "Push notifications enabled for deferred job updates.",
        });
      } catch (error) {
        setPushState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to update push notification settings right now.",
        });
      }
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-(--space-6) px-(--space-frame-default) py-(--space-section-loose) sm:py-(--space-frame-wide)">
      <header className="flex flex-col gap-(--space-3)">
        <p className="theme-label tier-micro uppercase text-foreground/42">Account</p>
        <h1 className="theme-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Profile
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/62 sm:text-base">
          Keep your public referral details current and make sure the AI and your profile page are working from the same account information.
        </p>
      </header>

      <div className="grid gap-(--space-6) lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <section className="profile-panel-surface p-(--space-inset-panel)" data-profile-surface="details-panel">
          <div className="mb-(--space-6) flex items-center justify-between gap-(--space-3)">
            <div>
              <h2 className="theme-display text-xl font-semibold tracking-tight">Profile details</h2>
              <p className="mt-(--space-1) text-sm text-foreground/52">
                These values are used by your account surface and by the profile MCP tools.
              </p>
            </div>
            <div className="flex flex-wrap gap-(--space-2)">
              {profile.roles.map((role) => (
                <span
                  key={role}
                  className="profile-role-pill rounded-full px-(--space-inset-compact) py-(--space-1) text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-foreground/48"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-(--space-4)">
            <div className="space-y-(--space-2)">
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

            <div className="space-y-(--space-2)">
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

            <div className="space-y-(--space-2)">
              <label htmlFor="profile-credential" className="form-label">Credential</label>
              <input
                id="profile-credential"
                value={credential}
                onChange={(event) => setCredential(event.target.value)}
                className="input-field"
                placeholder="Enterprise AI practitioner"
                aria-describedby="credential-description"
              />
              <p id="credential-description" className="text-xs leading-5 text-foreground/45">
                This appears in referral-aware greetings when your referral code is enabled.
              </p>
            </div>

            <div role="status" aria-live="polite" className={saveState.kind !== "idle" ? getProfileNoticeClassName(saveState.kind) : ""} data-profile-notice={saveState.kind !== "idle" ? saveState.kind : undefined}>
              {saveState.kind !== "idle" ? saveState.message : ""}
            </div>

            <div className="flex items-center justify-between gap-(--space-3) pt-(--space-2)">
              <p className="text-xs text-foreground/42">Changes save to the same backend used by the chat tools.</p>
              <button type="submit" className="btn-primary" disabled={isPending}>
                {isPending ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
        </section>

        <div className="flex flex-col gap-(--space-6)">
          <aside className="profile-feature-surface p-(--space-inset-panel)" data-profile-surface="referral-panel">
            <div className="flex flex-col gap-(--space-2)">
              <p className="theme-label tier-micro uppercase text-foreground/42">Referral QR</p>
              <h2 className="theme-display text-xl font-semibold tracking-tight">Your share link</h2>
              <p className="text-sm leading-6 text-foreground/56">
                If admin has enabled referrals for your account, your QR code and landing link appear here.
              </p>
            </div>

            {profile.affiliateEnabled && referralCode && profile.qrCodeUrl && referralUrl ? (
              <div className="mt-(--space-6) flex flex-col gap-(--space-4)">
                <div className="profile-qr-frame overflow-hidden p-(--space-inset-default)" data-profile-surface="qr-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profile.qrCodeUrl}
                    alt={`Referral QR code for ${profile.name}`}
                    className="mx-auto h-auto w-full max-w-56"
                  />
                </div>

                <div className="space-y-(--space-3)">
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-foreground/38">Referral code</p>
                    <div className="mt-(--space-1) flex items-center gap-(--space-2)">
                      <code className="rounded-md bg-background/80 px-(--space-inset-compact) py-(--space-inset-tight) text-sm text-foreground/78">
                        {referralCode}
                      </code>
                      <button
                        type="button"
                        className="profile-inline-action focus-ring rounded-full px-(--space-3) py-(--space-inset-tight) text-xs font-semibold transition-colors"
                        onClick={() => handleCopy(referralCode, "Referral code")}
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-foreground/38">Referral link</p>
                    <div className="mt-(--space-1) flex flex-col gap-(--space-2) sm:flex-row">
                      <input readOnly value={referralUrl} className="input-field flex-1" />
                      <button
                        type="button"
                        className="profile-inline-action focus-ring rounded-full px-(--space-inset-default) py-(--space-inset-tight) text-xs font-semibold transition-colors"
                        onClick={() => handleCopy(referralUrl, "Referral link")}
                      >
                        Copy link
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-(--space-2)">
                  <button type="button" className="btn-primary" onClick={handleDownloadQr}>
                    Download QR
                  </button>
                  <a
                    href={profile.qrCodeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="profile-inline-action focus-ring inline-flex min-h-11 items-center justify-center rounded-full px-(--space-inset-default) py-(--space-inset-tight) text-sm font-semibold transition-colors"
                  >
                    Open QR
                  </a>
                  <a
                    href={referralUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="profile-inline-action focus-ring inline-flex min-h-11 items-center justify-center rounded-full px-(--space-inset-default) py-(--space-inset-tight) text-sm font-semibold transition-colors"
                  >
                    Open link
                  </a>
                </div>
              </div>
            ) : (
              <div className="profile-empty-state mt-(--space-6) p-(--space-inset-panel) text-sm leading-6 text-foreground/52" data-profile-surface="empty-state">
                Referral access is not enabled for this account yet. Once an administrator enables affiliate status, your QR code will appear here automatically.
              </div>
            )}
          </aside>

          <section className="profile-panel-surface p-(--space-inset-panel)" data-profile-surface="notifications-panel">
            <div className="flex items-start justify-between gap-(--space-4)">
              <div>
                <p className="theme-label tier-micro uppercase text-foreground/42">Notifications</p>
                <h2 className="theme-display text-xl font-semibold tracking-tight">Deferred job alerts</h2>
                <p className="mt-(--space-1) text-sm leading-6 text-foreground/56">
                  Receive browser push alerts when queued tools like draft and publish finish after you leave the chat tab.
                </p>
              </div>
              <span className="rounded-full border border-border/70 bg-background/80 px-(--space-inset-compact) py-(--space-1) text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-foreground/48">
                {profile.pushNotificationsEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            <div className="mt-(--space-6) space-y-(--space-4)">
              {pushUnavailableReason ? (
                <div className="profile-empty-state p-(--space-inset-default) text-sm leading-6 text-foreground/52" data-profile-surface="push-unavailable">
                  {pushUnavailableReason}
                </div>
              ) : null}

              {pushState.kind !== "idle" ? (
                <div className={getProfileNoticeClassName(pushState.kind)} data-profile-notice={pushState.kind}>
                  {pushState.message}
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-(--space-3)">
                <p className="text-xs leading-5 text-foreground/45">
                  This account-level setting controls whether background job completion alerts are delivered.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handlePushNotificationsToggle}
                  disabled={isPushPending || Boolean(pushUnavailableReason)}
                >
                  {isPushPending
                    ? profile.pushNotificationsEnabled
                      ? "Disabling..."
                      : "Enabling..."
                    : profile.pushNotificationsEnabled
                      ? "Disable notifications"
                      : "Enable notifications"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>  );
}
