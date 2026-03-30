import { withAdminAction } from "@/lib/admin/shared/admin-action-helpers";
import {
  type AdminSearchResult,
  searchAdminEntities,
} from "./admin-search";

export const searchAction = withAdminAction(
  async (_user, formData): Promise<AdminSearchResult[]> => {
    const query = String(formData.get("query") ?? "").trim();
    if (query.length < 2) return [];
    return searchAdminEntities(query);
  },
);
