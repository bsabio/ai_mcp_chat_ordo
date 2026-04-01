import { redirect } from "next/navigation";

import { ReferralsWorkspace } from "@/components/referrals/ReferralsWorkspace";
import { getSessionUser } from "@/lib/auth";
import { loadReferralsWorkspace } from "@/lib/referrals/load-referrals-workspace";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const user = await getSessionUser();

  if (user.roles.includes("ANONYMOUS")) {
    redirect("/login");
  }

  const workspace = await loadReferralsWorkspace(user.id);

  return <ReferralsWorkspace workspace={workspace} />;
}