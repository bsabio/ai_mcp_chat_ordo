import Link from "next/link";

import { ReferralVisitActivator } from "@/components/referral/ReferralVisitActivator";
import { PublicStatusPage } from "@/components/public/PublicStatusPage";
import { getInstanceIdentity } from "@/lib/config/instance";
import { getActiveReferralSnapshot } from "@/lib/referrals/referral-resolver";

export const dynamic = "force-dynamic";

export default async function ReferralLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const identity = getInstanceIdentity();
  const { code } = await params;
  const referral = getActiveReferralSnapshot(code);

  if (!referral) {
    return (
      <PublicStatusPage
        brandName={identity.name}
        eyebrow="Referral unavailable"
        title="That referral link is not active"
        description="The shared link may be invalid, expired, or no longer enabled. You can still continue into Studio Ordo normally."
        primaryAction={{ href: "/", label: "Start a normal chat" }}
        secondaryAction={{ href: "/library", label: "Open library" }}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl items-center px-(--space-frame-default) py-(--space-section-loose)">
      <section className="profile-panel-surface grid w-full gap-(--space-6) p-(--space-inset-panel)" data-referral-landing="true">
        <ReferralVisitActivator code={referral.code} />
        <div className="grid gap-(--space-3)">
          <p className="theme-label tier-micro uppercase text-foreground/42">Referred introduction</p>
          <h1 className="theme-display max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {referral.name} invited you into {identity.name}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-foreground/62 sm:text-base">
            Start with the main chat surface and the first response will carry this introduction forward. If you want to browse first, the library stays open too.
          </p>
        </div>

        <div className="grid gap-(--space-4) rounded-3xl border border-foreground/10 bg-background/70 p-(--space-inset-panel)">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-foreground/38">Referrer</p>
            <p className="mt-(--space-1) text-lg font-semibold text-foreground">{referral.name}</p>
            <p className="text-sm text-foreground/58">
              {referral.credential?.trim() ? referral.credential : "Studio Ordo affiliate"}
            </p>
          </div>
          <p className="text-sm leading-6 text-foreground/56">
            This landing page validates the referral before any attribution is carried into chat or later account flows.
          </p>
        </div>

        <div className="flex flex-wrap gap-(--space-3)">
          <Link href="/" className="btn-primary">Start chat</Link>
          <Link
            href="/library"
            className="profile-inline-action focus-ring inline-flex min-h-11 items-center justify-center rounded-full px-(--space-inset-default) py-(--space-inset-tight) text-sm font-semibold transition-colors"
          >
            Open library
          </Link>
        </div>
      </section>
    </main>
  );
}
