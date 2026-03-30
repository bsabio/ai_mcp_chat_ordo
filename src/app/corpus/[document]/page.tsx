import { redirect } from "next/navigation";
import { getDocuments, getCorpusSummaries } from "@/lib/corpus-library";
import { getViewerRole, handleLibraryAccessDenied } from "@/lib/corpus-access";

export async function generateStaticParams() {
  const documents = await getDocuments({ publicOnly: true });
  return documents.map((document) => ({ document: document.slug }));
}

export default async function CorpusDocumentPage({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  const resolvedParams = await params;
  const role = await getViewerRole();
  const [documents, summaries, rawDocuments, rawSummaries] = await Promise.all([
    getDocuments({ role }),
    getCorpusSummaries({ role }),
    getDocuments(),
    getCorpusSummaries(),
  ]);
  const document = documents.find((item) => item.slug === resolvedParams.document);
  if (!document) {
    const rawDocument = rawDocuments.find((item) => item.slug === resolvedParams.document);
    const rawSummary = rawSummaries.find((item) => item.slug === resolvedParams.document);
    if (rawDocument || rawSummary) {
      handleLibraryAccessDenied(role);
    }
    redirect("/library");
  }

  const summary = summaries.find((item) => item.slug === document.slug);

  if (summary?.sectionSlugs?.[0]) {
    redirect(`/library/${document.slug}/${summary.sectionSlugs[0]}`);
  }

  redirect("/library");
}