"use server";

import { getSessionUser } from "@/lib/auth";
import { searchGlobalEntities, type GlobalSearchResult } from "./global-search";

export async function searchAction(formData: FormData): Promise<GlobalSearchResult[]> {
  const user = await getSessionUser();
  const query = String(formData.get("query") ?? "").trim();
  if (query.length < 2) {
    return [];
  }

  return searchGlobalEntities(query, { id: user.id, roles: user.roles });
}