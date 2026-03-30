import { getDb } from "@/lib/db";

export interface JournalAttributionEntry {
  postId: string;
  postTitle: string;
  postSlug: string;
  publishedAt: string;
  conversationsSourced: number;
  leadsGenerated: number;
  dealsGenerated: number;
  estimatedRevenue: number;
}

export async function loadJournalAttribution(
  options?: { afterDate?: string; beforeDate?: string },
): Promise<JournalAttributionEntry[]> {
  const db = getDb();

  // Get all published journal posts in the date range
  const dateFilters: string[] = ["bp.status = 'published'", "bp.published_at IS NOT NULL"];
  const params: unknown[] = [];

  if (options?.afterDate) {
    dateFilters.push("bp.published_at >= ?");
    params.push(options.afterDate);
  }
  if (options?.beforeDate) {
    dateFilters.push("bp.published_at <= ?");
    params.push(options.beforeDate);
  }

  const whereClause = dateFilters.join(" AND ");

  // For each published post, count conversations whose referral_source or
  // session_source contains the post slug, then trace through lead and
  // consultation paths to deals.
  const sql = `
    SELECT
      bp.id AS postId,
      bp.title AS postTitle,
      bp.slug AS postSlug,
      bp.published_at AS publishedAt,
      COALESCE(attr.conversationsSourced, 0) AS conversationsSourced,
      COALESCE(attr.leadsGenerated, 0) AS leadsGenerated,
      COALESCE(attr.dealsGenerated, 0) AS dealsGenerated,
      COALESCE(attr.estimatedRevenue, 0) AS estimatedRevenue
    FROM blog_posts bp
    LEFT JOIN (
      SELECT
        bp2.id AS postId,
        COUNT(DISTINCT c.id) AS conversationsSourced,
        COUNT(DISTINCT lr.id) AS leadsGenerated,
        COUNT(DISTINCT d.id) AS dealsGenerated,
        COALESCE(SUM(d.estimated_price), 0) AS estimatedRevenue
      FROM blog_posts bp2
      INNER JOIN conversations c
        ON (c.referral_source LIKE '%' || bp2.slug || '%'
         OR c.session_source LIKE '%' || bp2.slug || '%')
      LEFT JOIN lead_records lr ON lr.conversation_id = c.id
      LEFT JOIN deal_records d
        ON d.lead_record_id = lr.id
        OR d.consultation_request_id IN (
          SELECT cr.id FROM consultation_requests cr WHERE cr.conversation_id = c.id
        )
      GROUP BY bp2.id
    ) attr ON attr.postId = bp.id
    WHERE ${whereClause}
    ORDER BY COALESCE(attr.leadsGenerated, 0) DESC, bp.published_at DESC
  `;

  return db.prepare(sql).all(...params) as JournalAttributionEntry[];
}

export async function loadSinglePostAttribution(
  postSlug: string,
): Promise<{
  conversationsSourced: number;
  leadsGenerated: number;
  dealsGenerated: number;
  estimatedRevenue: number;
} | null> {
  const db = getDb();

  const sql = `
    SELECT
      COUNT(DISTINCT c.id) AS conversationsSourced,
      COUNT(DISTINCT lr.id) AS leadsGenerated,
      COUNT(DISTINCT d.id) AS dealsGenerated,
      COALESCE(SUM(d.estimated_price), 0) AS estimatedRevenue
    FROM conversations c
    LEFT JOIN lead_records lr ON lr.conversation_id = c.id
    LEFT JOIN deal_records d
      ON d.lead_record_id = lr.id
      OR d.consultation_request_id IN (
        SELECT cr.id FROM consultation_requests cr WHERE cr.conversation_id = c.id
      )
    WHERE c.referral_source LIKE '%' || ? || '%'
       OR c.session_source LIKE '%' || ? || '%'
  `;

  const row = db.prepare(sql).get(postSlug, postSlug) as {
    conversationsSourced: number;
    leadsGenerated: number;
    dealsGenerated: number;
    estimatedRevenue: number;
  } | undefined;

  return row ?? null;
}
