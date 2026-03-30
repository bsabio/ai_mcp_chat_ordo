import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getDocuments, getCorpusSummaries } from "@/lib/corpus-library";
import { getViewerRole, handleLibraryAccessDenied } from "@/lib/corpus-access";
import { getInstanceIdentity } from "@/lib/config/instance";

export async function generateStaticParams() {
  const documents = await getDocuments({ publicOnly: true });
  return documents.map((document) => ({ document: document.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ document: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const role = await getViewerRole();
  const documents = await getDocuments({ role });
  const document = documents.find((item) => item.slug === resolvedParams.document);
  if (!document) return {};
  const identity = getInstanceIdentity();
  return { title: `${document.title} | ${identity.name}` };
}

export default async function LibraryDocumentPage({
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
  if (!summary) {
    const rawSummary = rawSummaries.find((item) => item.slug === document.slug);
    if (rawSummary) {
      handleLibraryAccessDenied(role);
    }
    notFound();
  }

  if (summary.chapterSlugs?.[0] ?? summary.sectionSlugs?.[0]) {
    const firstChapter = summary.chapterSlugs?.[0] ?? summary.sectionSlugs?.[0];
    redirect(`/library/${document.slug}/${firstChapter}`);
  }

  redirect("/library");
}