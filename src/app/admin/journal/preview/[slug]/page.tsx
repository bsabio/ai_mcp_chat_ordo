import { generateAdminJournalPreviewMetadata, renderAdminJournalPreviewPage } from "@/lib/journal/admin-preview-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return generateAdminJournalPreviewMetadata(slug);
}

export default async function AdminJournalPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return renderAdminJournalPreviewPage(slug);
}