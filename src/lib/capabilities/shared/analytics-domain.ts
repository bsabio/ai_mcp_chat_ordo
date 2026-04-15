/**
 * Analytics Domain Module
 *
 * Sprint 11: Extracted from analytics-tool.ts to separate domain logic
 * (SQL queries, statistical computation, data transformation) from MCP
 * transport concerns.
 *
 * All pure query/compute functions live here. The MCP tool entry points
 * (conversationAnalytics, conversationInspect, conversationCohort) import
 * from this module.
 */
import type Database from "better-sqlite3";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalyticsToolDeps {
  db: Database.Database;
}

export type TimeRange = "24h" | "7d" | "30d" | "all";
export type AnalyticsMetric =
  | "overview"
  | "funnel"
  | "engagement"
  | "tool_usage"
  | "drop_off"
  | "routing_review";
export type CohortName = "anonymous" | "authenticated" | "converted";
export type CohortMetric = "message_count" | "tool_usage" | "session_duration" | "return_rate";

export interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  converted_from: string | null;
  message_count: number;
  first_message_at: string | null;
  last_tool_used: string | null;
  session_source: string;
  prompt_version: number | null;
  lane: string;
  lane_confidence: number | null;
  recommended_next_step: string | null;
  detected_need_summary: string | null;
  lane_last_analyzed_at: string | null;
}

export interface EventRow {
  conversation_id: string;
  event_type: string;
  metadata: string;
  created_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface RoutingReviewRow {
  conversation_id: string;
  title: string;
  user_id: string;
  status: string;
  lane: string;
  lane_confidence: number | null;
  recommended_next_step: string | null;
  detected_need_summary: string | null;
  lane_last_analyzed_at: string | null;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Range helpers
// ---------------------------------------------------------------------------

const RANGE_TO_SQL: Record<Exclude<TimeRange, "all">, string> = {
  "24h": "-24 hours",
  "7d": "-7 days",
  "30d": "-30 days",
};

export function getRangeCutoff(timeRange: TimeRange): string | null {
  if (timeRange === "all") {
    return null;
  }

  return RANGE_TO_SQL[timeRange];
}

// ---------------------------------------------------------------------------
// Data access (SQL queries)
// ---------------------------------------------------------------------------

export function getConversations(deps: AnalyticsToolDeps, timeRange: TimeRange): ConversationRow[] {
  const cutoff = getRangeCutoff(timeRange);

  if (!cutoff) {
    return deps.db.prepare(`SELECT * FROM conversations`).all() as ConversationRow[];
  }

  return deps.db
    .prepare(`SELECT * FROM conversations WHERE created_at > datetime('now', ?)`)
    .all(cutoff) as ConversationRow[];
}

export function getConversationIds(rows: ConversationRow[]): string[] {
  return rows.map((row) => row.id);
}

export function getEventsForConversations(
  deps: AnalyticsToolDeps,
  conversationIds: string[],
): EventRow[] {
  if (conversationIds.length === 0) {
    return [];
  }

  const placeholders = conversationIds.map(() => "?").join(", ");
  return deps.db
    .prepare(
      `SELECT conversation_id, event_type, metadata, created_at
       FROM conversation_events
       WHERE conversation_id IN (${placeholders})
       ORDER BY created_at ASC`,
    )
    .all(...conversationIds) as EventRow[];
}

export function getMessagesForConversations(
  deps: AnalyticsToolDeps,
  conversationIds: string[],
): MessageRow[] {
  if (conversationIds.length === 0) {
    return [];
  }

  const placeholders = conversationIds.map(() => "?").join(", ");
  return deps.db
    .prepare(
      `SELECT id, conversation_id, role, content, created_at
       FROM messages
       WHERE conversation_id IN (${placeholders})
       ORDER BY created_at ASC`,
    )
    .all(...conversationIds) as MessageRow[];
}

export function parseEventMetadata(row: EventRow): Record<string, unknown> {
  try {
    return JSON.parse(row.metadata) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Statistical helpers
// ---------------------------------------------------------------------------

export function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

export function percentile(values: number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

export function standardDeviation(values: number[]): number {
  if (values.length <= 1) {
    return 0;
  }

  const mean = average(values);
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

export function isAnonymousConversation(row: ConversationRow): boolean {
  return row.user_id.startsWith("anon_");
}

export function getArchivedDurationHours(events: EventRow[], conversationId: string): number | null {
  const archivedEvent = events.find(
    (row) => row.conversation_id === conversationId && row.event_type === "archived",
  );

  if (!archivedEvent) {
    return null;
  }

  const metadata = parseEventMetadata(archivedEvent);
  const duration = metadata.duration_hours;
  return typeof duration === "number" ? duration : null;
}

export function buildLaneDistribution(conversations: ConversationRow[]) {
  return conversations.reduce(
    (accumulator, conversation) => {
      const lane = conversation.lane === "organization" || conversation.lane === "individual"
        ? conversation.lane
        : "uncertain";
      accumulator[lane] += 1;
      return accumulator;
    },
    {
      organization: 0,
      individual: 0,
      uncertain: 0,
    },
  );
}

export function countEvents(events: EventRow[], eventType: string): number {
  return events.filter((event) => event.event_type === eventType).length;
}

// ---------------------------------------------------------------------------
// Report builders
// ---------------------------------------------------------------------------

export function buildOverview(deps: AnalyticsToolDeps, timeRange: TimeRange) {
  const conversations = getConversations(deps, timeRange);
  const events = getEventsForConversations(deps, getConversationIds(conversations));
  const laneDistribution = buildLaneDistribution(conversations);
  const durations = conversations
    .map((conversation) => getArchivedDurationHours(events, conversation.id))
    .filter((value): value is number => value != null);
  const anonymous = conversations.filter(isAnonymousConversation).length;
  const authenticated = conversations.length - anonymous;
  const converted = conversations.filter((conversation) => conversation.converted_from != null).length;

  return {
    metric: "overview",
    time_range: timeRange,
    total_conversations: conversations.length,
    anonymous_conversations: anonymous,
    authenticated_conversations: authenticated,
    avg_message_count: round(average(conversations.map((conversation) => conversation.message_count))),
    avg_session_duration_hours: round(average(durations)),
    converted_conversations: converted,
    conversion_rate: anonymous > 0 ? round(converted / anonymous) : 0,
    lane_distribution: laneDistribution,
    uncertain_conversations: laneDistribution.uncertain,
    lane_changed_events: countEvents(events, "lane_changed"),
    lane_uncertain_events: countEvents(events, "lane_uncertain"),
  };
}

export function buildFunnel(deps: AnalyticsToolDeps, timeRange: TimeRange) {
  const conversations = getConversations(deps, timeRange);
  const conversationIds = getConversationIds(conversations);
  const events = getEventsForConversations(deps, conversationIds);
  const eventMap = new Map<string, EventRow[]>();

  for (const event of events) {
    const existing = eventMap.get(event.conversation_id) ?? [];
    existing.push(event);
    eventMap.set(event.conversation_id, existing);
  }

  const stageAnonymousSessions = conversations.filter((conversation) => {
    const startedEvent = (eventMap.get(conversation.id) ?? []).find((event) => event.event_type === "started");
    const metadata = startedEvent ? parseEventMetadata(startedEvent) : null;
    return metadata?.session_source === "anonymous_cookie";
  }).length;

  const anonymousConversations = conversations.filter(isAnonymousConversation);
  const stageFirstMessage = anonymousConversations.filter((conversation) => conversation.message_count >= 1).length;
  const stageFivePlus = anonymousConversations.filter((conversation) => conversation.message_count >= 5).length;
  const stageRegistration = conversations.filter((conversation) => conversation.converted_from != null).length;
  const messages = getMessagesForConversations(deps, conversationIds);
  const conversionEvents = events.filter((event) => event.event_type === "converted");

  const stageContinuedUsage = conversionEvents.filter((event) => {
    return messages.some(
      (message) =>
        message.conversation_id === event.conversation_id && message.created_at > event.created_at,
    );
  }).length;

  const stages = [
    { name: "anonymous_sessions", count: stageAnonymousSessions },
    { name: "first_message", count: stageFirstMessage },
    { name: "five_plus_messages", count: stageFivePlus },
    { name: "registration", count: stageRegistration },
    { name: "continued_authenticated_usage", count: stageContinuedUsage },
  ];

  return {
    metric: "funnel",
    time_range: timeRange,
    stages: stages.map((stage, index) => ({
      ...stage,
      drop_off_rate:
        index === 0 || stages[index - 1].count === 0
          ? 0
          : round(1 - stage.count / stages[index - 1].count),
    })),
  };
}

export function buildHistogram(values: number[]) {
  const buckets = [
    { label: "1", min: 1, max: 1 },
    { label: "2-4", min: 2, max: 4 },
    { label: "5-9", min: 5, max: 9 },
    { label: "10-19", min: 10, max: 19 },
    { label: "20+", min: 20, max: Number.POSITIVE_INFINITY },
  ];

  return buckets.map((bucket) => ({
    bucket: bucket.label,
    count: values.filter((value) => value >= bucket.min && value <= bucket.max).length,
  }));
}

export function buildEngagement(deps: AnalyticsToolDeps, timeRange: TimeRange) {
  const conversations = getConversations(deps, timeRange);
  const messages = getMessagesForConversations(deps, getConversationIds(conversations));
  const messagesByConversation = new Map<string, MessageRow[]>();

  for (const message of messages) {
    const existing = messagesByConversation.get(message.conversation_id) ?? [];
    existing.push(message);
    messagesByConversation.set(message.conversation_id, existing);
  }

  const returnedConversations = conversations.filter((conversation) => {
    const rows = messagesByConversation.get(conversation.id) ?? [];
    const days = new Set(rows.map((row) => row.created_at.slice(0, 10)));
    return days.size > 1;
  });

  const topConversationTitles = [...conversations]
    .sort((left, right) => right.message_count - left.message_count)
    .slice(0, 5)
    .map((conversation) => ({
      conversation_id: conversation.id,
      title: conversation.title || "Untitled",
      message_count: conversation.message_count,
    }));

  return {
    metric: "engagement",
    time_range: timeRange,
    message_count_histogram: buildHistogram(conversations.map((conversation) => conversation.message_count)),
    return_rate: conversations.length > 0 ? round(returnedConversations.length / conversations.length) : 0,
    returned_conversations: returnedConversations.length,
    top_conversation_titles: topConversationTitles,
  };
}

export function buildToolUsage(deps: AnalyticsToolDeps, timeRange: TimeRange) {
  const conversations = getConversations(deps, timeRange);
  const conversationIds = getConversationIds(conversations);
  const events = getEventsForConversations(deps, conversationIds);
  const toolEvents = events.filter((event) => event.event_type === "tool_used");
  const conversionEventsByConversation = new Map(
    events
      .filter((event) => event.event_type === "converted")
      .map((event) => [event.conversation_id, event]),
  );

  const toolCounts = new Map<string, number>();
  const roleCounts = new Map<string, number>();
  const toolsBeforeRegistration = new Map<string, number>();
  const toolsBeforeAbandonment = new Map<string, number>();

  for (const event of toolEvents) {
    const metadata = parseEventMetadata(event);
    const toolName = typeof metadata.tool_name === "string" ? metadata.tool_name : "unknown";
    const role = typeof metadata.role === "string" ? metadata.role : "unknown";

    toolCounts.set(toolName, (toolCounts.get(toolName) ?? 0) + 1);
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);

    const conversionEvent = conversionEventsByConversation.get(event.conversation_id);
    if (conversionEvent && event.created_at <= conversionEvent.created_at) {
      toolsBeforeRegistration.set(toolName, (toolsBeforeRegistration.get(toolName) ?? 0) + 1);
    }

    const conversation = conversations.find((row) => row.id === event.conversation_id);
    if (conversation && conversation.status === "archived" && conversation.converted_from == null) {
      toolsBeforeAbandonment.set(toolName, (toolsBeforeAbandonment.get(toolName) ?? 0) + 1);
    }
  }

  return {
    metric: "tool_usage",
    time_range: timeRange,
    tool_calls_by_name: Object.fromEntries(toolCounts),
    tool_calls_by_role: Object.fromEntries(roleCounts),
    tools_preceding_registration: Object.fromEntries(toolsBeforeRegistration),
    tools_preceding_abandonment: Object.fromEntries(toolsBeforeAbandonment),
  };
}

export function calculateMedianGapMs(rows: ConversationRow[]): number | null {
  if (rows.length < 3) {
    return null;
  }

  const sorted = [...rows].sort((left, right) => left.updated_at.localeCompare(right.updated_at));
  const gaps: number[] = [];

  for (let index = 1; index < sorted.length; index += 1) {
    const prev = new Date(sorted[index - 1].updated_at).getTime();
    const current = new Date(sorted[index].updated_at).getTime();
    gaps.push(current - prev);
  }

  return median(gaps);
}

export function buildDropOff(deps: AnalyticsToolDeps, timeRange: TimeRange) {
  const conversations = getConversations(deps, timeRange);
  const messages = getMessagesForConversations(deps, getConversationIds(conversations));
  const events = getEventsForConversations(deps, getConversationIds(conversations));
  const conversationsByUser = new Map<string, ConversationRow[]>();
  const lastMessageByConversation = new Map<string, MessageRow>();
  const toolUsageByConversation = new Map<string, string[]>();

  for (const conversation of conversations) {
    const existing = conversationsByUser.get(conversation.user_id) ?? [];
    existing.push(conversation);
    conversationsByUser.set(conversation.user_id, existing);
  }

  for (const message of messages) {
    lastMessageByConversation.set(message.conversation_id, message);
  }

  for (const event of events) {
    if (event.event_type !== "tool_used") {
      continue;
    }

    const metadata = parseEventMetadata(event);
    const toolName = typeof metadata.tool_name === "string" ? metadata.tool_name : "unknown";
    const existing = toolUsageByConversation.get(event.conversation_id) ?? [];
    existing.push(toolName);
    toolUsageByConversation.set(event.conversation_id, existing);
  }

  const now = Date.now();
  const grouped = {
    anonymous: [] as Array<Record<string, unknown>>,
    authenticated: [] as Array<Record<string, unknown>>,
  };

  for (const conversation of conversations) {
    const userConversations = conversationsByUser.get(conversation.user_id) ?? [];
    const medianGapMs = calculateMedianGapMs(userConversations);
    const thresholdMs = medianGapMs != null
      ? Math.max(2 * medianGapMs, 48 * 60 * 60 * 1000)
      : isAnonymousConversation(conversation) && userConversations.length < 2
        ? 48 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;
    const inactiveMs = now - new Date(conversation.updated_at).getTime();

    if (inactiveMs <= thresholdMs) {
      continue;
    }

    const lastMessage = lastMessageByConversation.get(conversation.id);
    const preview = lastMessage ? lastMessage.content.slice(0, 100) : "";
    const key = isAnonymousConversation(conversation) ? "anonymous" : "authenticated";
    grouped[key].push({
      conversation_id: conversation.id,
      title: conversation.title || "Untitled",
      inactive_hours: round(inactiveMs / (60 * 60 * 1000)),
      last_message_preview: preview,
      tools_before_drop_off: toolUsageByConversation.get(conversation.id) ?? [],
    });
  }

  return {
    metric: "drop_off",
    time_range: timeRange,
    anonymous: grouped.anonymous,
    authenticated: grouped.authenticated,
  };
}

export function compareRecent(left: string | null, right: string | null): number {
  if (left == null && right == null) {
    return 0;
  }

  if (left == null) {
    return 1;
  }

  if (right == null) {
    return -1;
  }

  return right.localeCompare(left);
}

export function buildRoutingReview(
  deps: AnalyticsToolDeps,
  timeRange: TimeRange,
  limitArg?: number,
) {
  const conversations = getConversations(deps, timeRange);
  const conversationIds = getConversationIds(conversations);
  const events = getEventsForConversations(deps, conversationIds);
  const limit = Math.min(Math.max(limitArg ?? 10, 1), 50);

  const conversationMap = new Map(conversations.map((conversation) => [conversation.id, conversation]));
  const laneChangedEvents = events
    .filter((event) => event.event_type === "lane_changed")
    .sort((left, right) => right.created_at.localeCompare(left.created_at));

  const recentlyChanged = laneChangedEvents
    .map((event) => {
      const conversation = conversationMap.get(event.conversation_id);

      if (!conversation) {
        return null;
      }

      const metadata = parseEventMetadata(event);
      return {
        conversation_id: conversation.id,
        title: conversation.title || "Untitled",
        user_id: conversation.user_id,
        from_lane: typeof metadata.from_lane === "string" ? metadata.from_lane : "unknown",
        to_lane: typeof metadata.to_lane === "string" ? metadata.to_lane : conversation.lane,
        lane_confidence: conversation.lane_confidence,
        recommended_next_step: conversation.recommended_next_step,
        changed_at: event.created_at,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .slice(0, limit);

  const uncertainConversations = conversations
    .filter((conversation) => conversation.lane === "uncertain")
    .sort((left, right) => {
      const analyzedOrder = compareRecent(left.lane_last_analyzed_at, right.lane_last_analyzed_at);
      if (analyzedOrder !== 0) {
        return analyzedOrder;
      }

      return right.updated_at.localeCompare(left.updated_at);
    })
    .slice(0, limit)
    .map((conversation): RoutingReviewRow => ({
      conversation_id: conversation.id,
      title: conversation.title || "Untitled",
      user_id: conversation.user_id,
      status: conversation.status,
      lane: conversation.lane,
      lane_confidence: conversation.lane_confidence,
      recommended_next_step: conversation.recommended_next_step,
      detected_need_summary: conversation.detected_need_summary,
      lane_last_analyzed_at: conversation.lane_last_analyzed_at,
      updated_at: conversation.updated_at,
    }));

  const followUpReady = conversations
    .filter(
      (conversation) =>
        (conversation.lane === "organization" || conversation.lane === "individual")
        && (conversation.lane_confidence ?? 0) >= 0.7,
    )
    .sort((left, right) => {
      const analyzedOrder = compareRecent(left.lane_last_analyzed_at, right.lane_last_analyzed_at);
      if (analyzedOrder !== 0) {
        return analyzedOrder;
      }

      return right.updated_at.localeCompare(left.updated_at);
    })
    .slice(0, limit)
    .map((conversation): RoutingReviewRow => ({
      conversation_id: conversation.id,
      title: conversation.title || "Untitled",
      user_id: conversation.user_id,
      status: conversation.status,
      lane: conversation.lane,
      lane_confidence: conversation.lane_confidence,
      recommended_next_step: conversation.recommended_next_step,
      detected_need_summary: conversation.detected_need_summary,
      lane_last_analyzed_at: conversation.lane_last_analyzed_at,
      updated_at: conversation.updated_at,
    }));

  return {
    metric: "routing_review",
    time_range: timeRange,
    limits: {
      per_queue: limit,
    },
    summary: {
      recently_changed_count: laneChangedEvents.length,
      uncertain_count: conversations.filter((conversation) => conversation.lane === "uncertain").length,
      follow_up_ready_count: conversations.filter(
        (conversation) =>
          (conversation.lane === "organization" || conversation.lane === "individual")
          && (conversation.lane_confidence ?? 0) >= 0.7,
      ).length,
    },
    recently_changed: recentlyChanged,
    uncertain_conversations: uncertainConversations,
    follow_up_ready: followUpReady,
  };
}

// ---------------------------------------------------------------------------
// Cohort analysis helpers
// ---------------------------------------------------------------------------

export function getCohortRows(
  deps: AnalyticsToolDeps,
  cohort: CohortName,
): ConversationRow[] {
  switch (cohort) {
    case "anonymous":
      return deps.db
        .prepare(
          `SELECT * FROM conversations WHERE user_id LIKE 'anon_%' AND converted_from IS NULL`,
        )
        .all() as ConversationRow[];
    case "authenticated":
      return deps.db
        .prepare(
          `SELECT * FROM conversations WHERE user_id NOT LIKE 'anon_%' AND converted_from IS NULL`,
        )
        .all() as ConversationRow[];
    case "converted":
      return deps.db
        .prepare(`SELECT * FROM conversations WHERE converted_from IS NOT NULL`)
        .all() as ConversationRow[];
    default:
      throw new Error(`Unsupported cohort: ${cohort}`);
  }
}

export function getCohortValues(
  deps: AnalyticsToolDeps,
  cohort: CohortName,
  metric: CohortMetric,
): number[] {
  const rows = getCohortRows(deps, cohort);

  switch (metric) {
    case "message_count":
      return rows.map((row) => row.message_count);
    case "tool_usage": {
      return rows.map((row) => {
        const countRow = deps.db
          .prepare(
            `SELECT COUNT(*) AS count
             FROM conversation_events
             WHERE conversation_id = ? AND event_type = 'tool_used'`,
          )
          .get(row.id) as { count: number };
        return countRow.count;
      });
    }
    case "session_duration": {
      const events = getEventsForConversations(deps, rows.map((row) => row.id));
      return rows
        .map((row) => getArchivedDurationHours(events, row.id) ?? 0)
        .filter((value) => value >= 0);
    }
    case "return_rate": {
      const messages = getMessagesForConversations(deps, rows.map((row) => row.id));
      const grouped = new Map<string, Set<string>>();
      for (const message of messages) {
        const existing = grouped.get(message.conversation_id) ?? new Set<string>();
        existing.add(message.created_at.slice(0, 10));
        grouped.set(message.conversation_id, existing);
      }
      return rows.map((row) => ((grouped.get(row.id)?.size ?? 0) > 1 ? 1 : 0));
    }
    default:
      throw new Error(`Unsupported cohort metric: ${metric}`);
  }
}

export function buildStats(values: number[]) {
  return {
    count: values.length,
    mean: round(average(values)),
    median: round(median(values)),
    stddev: round(standardDeviation(values)),
    p95: round(percentile(values, 0.95)),
  };
}
