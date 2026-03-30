import { getCorpusIndex } from "@/lib/corpus-library";
import { getViewerRole, handleLibraryAccessDenied } from "@/lib/corpus-access";
import { notFound, redirect } from "next/navigation";

export default function OldChapterPage({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  return (async () => {
    const resolvedParams = await params;
    const role = await getViewerRole();
    const [index, rawIndex] = await Promise.all([
      getCorpusIndex({ role }),
      getCorpusIndex(),
    ]);
    const match = index.find((entry) => entry.chapterSlug === resolvedParams.chapter);

    if (!match) {
      const rawMatch = rawIndex.find((entry) => entry.chapterSlug === resolvedParams.chapter);
      if (rawMatch) {
        handleLibraryAccessDenied(role);
      }
      notFound();
    }

    redirect(`/library/${match.bookSlug}/${match.chapterSlug}`);
  })();
}
