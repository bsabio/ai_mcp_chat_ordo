import { getCorpusIndex } from "@/lib/corpus-library";
import { getViewerRole, handleLibraryAccessDenied } from "@/lib/corpus-access";
import { notFound, redirect } from "next/navigation";

export default async function CorpusSectionResolverPage({
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
  const match = index.find((entry) => entry.chapterSlug === resolvedParams.slug);

  if (!match) {
    const bookMatch = index.find((entry) => entry.bookSlug === resolvedParams.slug);
    if (bookMatch) {
      redirect(`/library/${bookMatch.bookSlug}`);
    }
  }

  if (!match) {
    const rawMatch = rawIndex.find((entry) => entry.chapterSlug === resolvedParams.slug);
    const rawBookMatch = rawIndex.find((entry) => entry.bookSlug === resolvedParams.slug);
    if (rawMatch || rawBookMatch) {
      handleLibraryAccessDenied(role);
    }
    notFound();
  }

  redirect(`/library/${match.bookSlug}/${match.chapterSlug}`);
}