import { notFound, redirect } from "next/navigation";

import { getCorpusIndex } from "@/lib/corpus-library";
import { getViewerRole, handleLibraryAccessDenied } from "@/lib/corpus-access";
import { findCorpusBookMatch, findCorpusChapterMatch } from "@/lib/corpus-route-aliases";

export default async function LibrarySectionResolverPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const role = await getViewerRole();
  const [index, rawIndex] = await Promise.all([
    getCorpusIndex({ role }),
    getCorpusIndex(),
  ]);
  const match = findCorpusChapterMatch(index, resolvedParams.slug);

  if (!match) {
    const bookMatch = findCorpusBookMatch(index, resolvedParams.slug);
    if (bookMatch) {
      redirect(`/library/${bookMatch.bookSlug}`);
    }
  }

  if (!match) {
    const rawMatch = findCorpusChapterMatch(rawIndex, resolvedParams.slug);
    const rawBookMatch = findCorpusBookMatch(rawIndex, resolvedParams.slug);
    if (rawMatch || rawBookMatch) {
      handleLibraryAccessDenied(role);
    }
    notFound();
  }

  redirect(`/library/${match.bookSlug}/${match.chapterSlug}`);
}