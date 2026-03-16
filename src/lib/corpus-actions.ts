"use server";

import { getSectionFull } from "./corpus-library";

export async function getSectionContentAction(documentSlug: string, sectionSlug: string) {
	const result = await getSectionFull(documentSlug, sectionSlug);
	return {
		content: result?.content || "",
	};
}