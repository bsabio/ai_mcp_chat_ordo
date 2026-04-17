import type { Metadata } from "next";

import { MediaOperationsWorkspace } from "@/components/media/MediaOperationsWorkspace";
import { loadOperationsMediaWorkspace } from "@/lib/media/media-operations";
import { requireOperationsWorkspaceAccess } from "@/lib/operations/operations-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operations Media",
  robots: { index: false, follow: false },
};

export default async function OperationsMediaPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const user = await requireOperationsWorkspaceAccess();
  const rawSearchParams = searchParams ? await searchParams : {};
  const workspace = await loadOperationsMediaWorkspace(user.roles, rawSearchParams);

  return (
    <MediaOperationsWorkspace
      userName={user.name}
      filters={workspace.filters}
      items={workspace.items}
      totalCount={workspace.totalCount}
      page={workspace.page}
      pageSize={workspace.pageSize}
      hasPrevPage={workspace.hasPrevPage}
      hasNextPage={workspace.hasNextPage}
      fleetAccount={workspace.fleetAccount}
      hostCapacity={workspace.hostCapacity}
    />
  );
}