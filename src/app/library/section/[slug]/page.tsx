import { notFound, redirect } from "next/navigation";

import { getCorpusIndex } from "@/lib/corpus-library";

export default async function LibrarySectionResolverPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const index = await getCorpusIndex();
  const match = index.find((entry) => entry.chapterSlug === resolvedParams.slug);

  if (!match) {
    const bookMatch = index.find((entry) => entry.bookSlug === resolvedParams.slug);
    if (bookMatch) {
      redirect(`/library/${bookMatch.bookSlug}`);
    }
  }

  if (!match) {
    notFound();
  }

  redirect(`/library/${match.bookSlug}/${match.chapterSlug}`);
}