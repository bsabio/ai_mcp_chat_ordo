import { getCorpusIndex } from "@/lib/corpus-library";
import { notFound, redirect } from "next/navigation";

export default async function CorpusSectionResolverPage({
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