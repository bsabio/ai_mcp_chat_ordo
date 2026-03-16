"use server";

import { getSectionFull } from "./corpus-library";

/**
 * Server action to fetch chapter content.
 */
export async function getChapter(bookSlug: string, chapterSlug: string) {
  const result = await getSectionFull(bookSlug, chapterSlug);
  return {
    content: result?.content || "",
  };
}
