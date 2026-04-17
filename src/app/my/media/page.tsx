import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserMediaWorkspace } from "@/components/media/UserMediaWorkspace";
import { getSessionUser } from "@/lib/auth";
import { loadUserMediaWorkspace } from "@/lib/media/user-media";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Media",
  robots: { index: false, follow: false },
};

export default async function MyMediaPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const user = await getSessionUser();

  if (user.roles.includes("ANONYMOUS")) {
    redirect("/login");
  }

  const rawSearchParams = searchParams ? await searchParams : {};
  const workspace = await loadUserMediaWorkspace(user.id, rawSearchParams);

  return (
    <UserMediaWorkspace
      userName={user.name}
      items={workspace.items}
      filters={workspace.filters}
      summary={workspace.summary}
      quota={workspace.quota}
      hasMore={workspace.hasMore}
    />
  );
}