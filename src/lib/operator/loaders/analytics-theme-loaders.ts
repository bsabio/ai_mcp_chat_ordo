import type { User as SessionUser } from "@/core/entities/user";

import {
  type OperatorBlockPayload,
  type RecurringPainThemesBlockData,
  type ThemeSummaryRow,
} from "../operator-shared";
import {
  buildRecurringPainThemesData,
  collectRecurringPainThemes,
  requireAdminDb,
} from "../operator-loader-helpers";

export async function loadRecurringPainThemesBlock(
  user: Pick<SessionUser, "id" | "roles">,
): Promise<OperatorBlockPayload<RecurringPainThemesBlockData>> {
  const summaries = requireAdminDb(user)
    .prepare(
      `SELECT
         c.id AS conversation_id,
         COALESCE(c.title, '') AS conversation_title,
         c.updated_at,
         COALESCE(lr.problem_summary, c.detected_need_summary) AS summary_text
       FROM conversations c
       LEFT JOIN lead_records lr ON lr.conversation_id = c.id
       WHERE COALESCE(lr.problem_summary, c.detected_need_summary) IS NOT NULL
       ORDER BY c.updated_at DESC
       LIMIT 100`,
    )
    .all() as ThemeSummaryRow[];
  const themes = collectRecurringPainThemes(summaries);

  return {
    blockId: "recurring_pain_themes",
    state: themes.length > 0 ? "ready" : "empty",
    data: buildRecurringPainThemesData(summaries.length, themes),
  };
}