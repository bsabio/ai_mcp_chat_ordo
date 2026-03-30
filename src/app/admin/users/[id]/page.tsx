import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminDetailShell } from "@/components/admin/AdminDetailShell";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";
import { loadAdminUserDetail } from "@/lib/admin/users/admin-users";
import {
  updateRoleAction,
  toggleAffiliateAction,
  ROLE_OPTIONS,
} from "@/lib/admin/users/admin-users-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "User Detail",
  robots: { index: false, follow: false },
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPageAccess();
  const { id } = await params;
  const detail = await loadAdminUserDetail(id);

  return (
    <AdminSection
      title={detail.user.name}
      description={detail.user.email}
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Users", href: "/admin/users" },
        { label: detail.user.name },
      ]}
    >
      <div className="px-(--space-inset-panel)">
        <AdminDetailShell
          backHref="/admin/users"
          backLabel="All Users"
          main={
            <div className="grid gap-(--space-section-default)">
              {/* Profile card */}
              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                <h2 className="text-sm font-semibold text-foreground/60">Profile</h2>
                <dl className="mt-(--space-3) grid gap-(--space-2) text-sm">
                  <div className="flex justify-between">
                    <dt className="text-foreground/50">Name</dt>
                    <dd className="text-foreground">{detail.user.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-foreground/50">Email</dt>
                    <dd className="text-foreground">{detail.user.email}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-foreground/50">Signed up</dt>
                    <dd className="text-foreground">{detail.user.createdLabel}</dd>
                  </div>
                  {detail.user.credential && (
                    <div className="flex justify-between">
                      <dt className="text-foreground/50">Credential</dt>
                      <dd className="text-foreground">{detail.user.credential}</dd>
                    </div>
                  )}
                </dl>
              </section>

              {/* Role management */}
              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                <h2 className="text-sm font-semibold text-foreground/60">Role</h2>
                <div className="mt-(--space-3) flex items-center gap-(--space-3)">
                  <span className="inline-flex rounded-full border border-foreground/12 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]">
                    {detail.user.roleLabel}
                  </span>
                  <form action={updateRoleAction} className="flex items-center gap-(--space-2)">
                    <input id="role-user-id" type="hidden" name="userId" value={detail.user.id} />
                    <select
                      id="role-select"
                      name="roleId"
                      aria-label="Assign role"
                      aria-describedby="role-select-desc"
                      aria-invalid={false}
                      defaultValue={ROLE_OPTIONS.find((r) => detail.user.roles.includes(r.roleName))?.value ?? "role_authenticated"}
                      className="h-8 rounded-lg border border-foreground/12 bg-surface px-2 text-xs text-foreground"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <p id="role-select-desc" className="sr-only">Select the role to assign to this user</p>
                    <button
                      type="submit"
                      className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14"
                    >
                      Update role
                    </button>
                  </form>
                </div>
              </section>

              {/* Affiliate toggle */}
              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                <h2 className="text-sm font-semibold text-foreground/60">Affiliate</h2>
                <div className="mt-(--space-3) flex items-center gap-(--space-3)">
                  <form action={toggleAffiliateAction} className="flex items-center gap-(--space-2)">
                    <input id="affiliate-user-id" type="hidden" name="userId" value={detail.user.id} />
                    <input id="affiliate-enabled" type="hidden" name="enabled" value={detail.user.affiliateEnabled ? "false" : "true"} />
                    <span className="text-sm text-foreground/60">
                      {detail.user.affiliateEnabled ? "Enabled" : "Disabled"}
                    </span>
                    {detail.user.referralCode && (
                      <code className="rounded bg-foreground/5 px-2 py-0.5 text-xs text-foreground/70">
                        {detail.user.referralCode}
                      </code>
                    )}
                    <button
                      type="submit"
                      className="rounded-lg border border-foreground/12 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/5"
                    >
                      {detail.user.affiliateEnabled ? "Disable" : "Enable"}
                    </button>
                  </form>
                </div>
              </section>
            </div>
          }
          sidebar={
            <div className="grid gap-(--space-section-default)">
              {/* Conversation summary */}
              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                <h2 className="text-sm font-semibold text-foreground/60">
                  Conversations ({detail.conversationCount})
                </h2>
                {detail.recentConversations.length === 0 ? (
                  <p className="mt-(--space-2) text-xs text-foreground/40">No conversations yet.</p>
                ) : (
                  <ul className="mt-(--space-2) grid gap-(--space-1) text-xs">
                    {detail.recentConversations.map((c) => (
                      <li key={c.id} className="flex justify-between text-foreground/60">
                        <span className="truncate">{c.title || "Untitled"}</span>
                        <span className="ml-2 shrink-0 text-foreground/40">{c.lane}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Referral history */}
              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                <h2 className="text-sm font-semibold text-foreground/60">Referral history</h2>
                {detail.referrals.length === 0 ? (
                  <p className="mt-(--space-2) text-xs text-foreground/40">No referrals recorded.</p>
                ) : (
                  <ul className="mt-(--space-2) grid gap-(--space-1) text-xs">
                    {detail.referrals.map((r) => (
                      <li key={r.id} className="flex justify-between text-foreground/60">
                        <span>{r.referralCode}</span>
                        <span className="text-foreground/40">{r.outcome ?? "pending"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* User preferences */}
              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                <h2 className="text-sm font-semibold text-foreground/60">Preferences</h2>
                {detail.preferences.length === 0 ? (
                  <p className="mt-(--space-2) text-xs text-foreground/40">No preferences set.</p>
                ) : (
                  <dl className="mt-(--space-2) grid gap-(--space-1) text-xs">
                    {detail.preferences.map((p) => (
                      <div key={p.key} className="flex justify-between text-foreground/60">
                        <dt>{p.key}</dt>
                        <dd className="text-foreground/40">{p.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            </div>
          }
        />
      </div>
    </AdminSection>
  );
}
