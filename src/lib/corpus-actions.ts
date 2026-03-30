"use server";

import { getViewerRole } from "./corpus-access";
import { getSectionFull } from "./corpus-library";

export async function getSectionContentAction(documentSlug: string, sectionSlug: string) {
	const role = await getViewerRole();
	const result = await getSectionFull(documentSlug, sectionSlug, { role });
	return {
		content: result?.content || "",
	};
}