import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";

import {
  conversationAnalytics,
  conversationCohort,
  conversationInspect,
} from "@/lib/capabilities/shared/analytics-tool";
import { ensureSchema } from "@/lib/db/schema";

function createDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  ensureSchema(db);
  return db;
}

function seedUser(db: Database.Database, id: string, email = `${id}@example.com`) {
  db.prepare(`INSERT INTO users (id, email, name) VALUES (?, ?, ?)`)
    .run(id, email, id);
}

function seedConversation(
  db: Database.Database,
  row: {
    id: string;
    userId: string;
    title: string;
    status?: "active" | "archived";
    createdAt?: string;
    updatedAt?: string;
    convertedFrom?: string | null;
    messageCount?: number;
    sessionSource?: string;
    lane?: "organization" | "individual" | "uncertain";
    laneConfidence?: number | null;
    recommendedNextStep?: string | null;
    detectedNeedSummary?: string | null;
    laneLastAnalyzedAt?: string | null;
  },
) {
  db.prepare(
    `INSERT INTO conversations (
      id, user_id, title, status, created_at, updated_at, converted_from, message_count, session_source,
      lane, lane_confidence, recommended_next_step, detected_need_summary, lane_last_analyzed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    row.id,
    row.userId,
    row.title,
    row.status ?? "active",
    row.createdAt ?? "2026-03-10 10:00:00",
    row.updatedAt ?? row.createdAt ?? "2026-03-10 10:00:00",
    row.convertedFrom ?? null,
    row.messageCount ?? 0,
    row.sessionSource ?? (row.userId.startsWith("anon_") ? "anonymous_cookie" : "authenticated"),
    row.lane ?? "uncertain",
    row.laneConfidence ?? null,
    row.recommendedNextStep ?? null,
    row.detectedNeedSummary ?? null,
    row.laneLastAnalyzedAt ?? null,
  );
}

function seedMessage(
  db: Database.Database,
  row: {
    id: string;
    conversationId: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: string;
  },
) {
  db.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, parts, created_at, token_estimate)
     VALUES (?, ?, ?, ?, '[]', ?, 0)`,
  ).run(row.id, row.conversationId, row.role, row.content, row.createdAt);
}

function seedEvent(
  db: Database.Database,
  row: {
    id: string;
    conversationId: string;
    eventType: string;
    metadata: Record<string, unknown>;
    createdAt: string;
  },
) {
  db.prepare(
    `INSERT INTO conversation_events (id, conversation_id, event_type, metadata, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(row.id, row.conversationId, row.eventType, JSON.stringify(row.metadata), row.createdAt);
}

describe("conversation analytics tools", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDb();
    seedUser(db, "anon_alpha", "anon_alpha@anonymous.local");
    seedUser(db, "anon_beta", "anon_beta@anonymous.local");
    seedUser(db, "anon_gamma", "anon_gamma@anonymous.local");
    seedUser(db, "usr_1");
    seedUser(db, "usr_2");
    seedUser(db, "usr_3");

    seedConversation(db, {
      id: "conv_anon_a",
      userId: "anon_alpha",
      title: "Anon research",
      status: "archived",
      createdAt: "2026-03-10 10:00:00",
      updatedAt: "2026-03-12 10:00:00",
      messageCount: 6,
      sessionSource: "anonymous_cookie",
    });
    seedConversation(db, {
      id: "conv_anon_b",
      userId: "anon_beta",
      title: "Short anonymous visit",
      status: "archived",
      createdAt: "2026-03-11 09:00:00",
      updatedAt: "2026-03-11 09:30:00",
      messageCount: 2,
      sessionSource: "anonymous_cookie",
    });
    seedConversation(db, {
      id: "conv_converted",
      userId: "usr_1",
      title: "Converted session",
      status: "archived",
      createdAt: "2026-03-11 11:00:00",
      updatedAt: "2026-03-13 14:00:00",
      convertedFrom: "anon_gamma",
      messageCount: 8,
      sessionSource: "authenticated",
    });
    seedConversation(db, {
      id: "conv_auth_active",
      userId: "usr_2",
      title: "Ongoing product work",
      status: "active",
      createdAt: "2026-03-13 08:00:00",
      updatedAt: "2026-03-15 08:00:00",
      messageCount: 10,
      sessionSource: "authenticated",
      lane: "organization",
      laneConfidence: 0.95,
      recommendedNextStep: "Move to advisory scoping",
      detectedNeedSummary: "Product team needs process redesign.",
      laneLastAnalyzedAt: "2026-03-15 08:30:00",
    });
    seedConversation(db, {
      id: "conv_auth_archived",
      userId: "usr_3",
      title: "Archived staff review",
      status: "archived",
      createdAt: "2026-03-08 08:00:00",
      updatedAt: "2026-03-09 08:00:00",
      messageCount: 4,
      sessionSource: "authenticated",
    });

    seedMessage(db, {
      id: "msg_1",
      conversationId: "conv_converted",
      role: "user",
      content: "Anonymous origin message before conversion.",
      createdAt: "2026-03-11 11:10:00",
    });
    seedMessage(db, {
      id: "msg_2",
      conversationId: "conv_converted",
      role: "assistant",
      content: "Converted answer before registration.",
      createdAt: "2026-03-11 11:11:00",
    });
    seedMessage(db, {
      id: "msg_3",
      conversationId: "conv_converted",
      role: "user",
      content: "Follow-up after registration.",
      createdAt: "2026-03-12 11:30:00",
    });
    seedMessage(db, {
      id: "msg_4",
      conversationId: "conv_auth_active",
      role: "user",
      content: "Day one planning.",
      createdAt: "2026-03-13 08:10:00",
    });
    seedMessage(db, {
      id: "msg_5",
      conversationId: "conv_auth_active",
      role: "assistant",
      content: "Day two planning.",
      createdAt: "2026-03-14 08:10:00",
    });
    seedMessage(db, {
      id: "msg_6",
      conversationId: "conv_anon_a",
      role: "user",
      content: "This is a long anonymous thread that should appear in previews.",
      createdAt: "2026-03-10 10:10:00",
    });

    seedEvent(db, {
      id: "evt_1",
      conversationId: "conv_anon_a",
      eventType: "started",
      metadata: { session_source: "anonymous_cookie" },
      createdAt: "2026-03-10 10:00:00",
    });
    seedEvent(db, {
      id: "evt_2",
      conversationId: "conv_anon_a",
      eventType: "tool_used",
      metadata: { tool_name: "search_corpus", role: "ANONYMOUS" },
      createdAt: "2026-03-10 10:20:00",
    });
    seedEvent(db, {
      id: "evt_3",
      conversationId: "conv_anon_a",
      eventType: "archived",
      metadata: { message_count: 6, duration_hours: 48 },
      createdAt: "2026-03-12 10:00:00",
    });
    seedEvent(db, {
      id: "evt_4",
      conversationId: "conv_anon_b",
      eventType: "started",
      metadata: { session_source: "anonymous_cookie" },
      createdAt: "2026-03-11 09:00:00",
    });
    seedEvent(db, {
      id: "evt_5",
      conversationId: "conv_anon_b",
      eventType: "archived",
      metadata: { message_count: 2, duration_hours: 0.5 },
      createdAt: "2026-03-11 09:30:00",
    });
    seedEvent(db, {
      id: "evt_6",
      conversationId: "conv_converted",
      eventType: "started",
      metadata: { session_source: "anonymous_cookie" },
      createdAt: "2026-03-11 11:00:00",
    });
    seedEvent(db, {
      id: "evt_7",
      conversationId: "conv_converted",
      eventType: "tool_used",
      metadata: { tool_name: "search_my_conversations", role: "AUTHENTICATED" },
      createdAt: "2026-03-11 11:05:00",
    });
    seedEvent(db, {
      id: "evt_8",
      conversationId: "conv_converted",
      eventType: "converted",
      metadata: { from: "anon_gamma", to: "usr_1" },
      createdAt: "2026-03-11 11:20:00",
    });
    seedEvent(db, {
      id: "evt_9",
      conversationId: "conv_converted",
      eventType: "archived",
      metadata: { message_count: 8, duration_hours: 51 },
      createdAt: "2026-03-13 14:00:00",
    });
    seedEvent(db, {
      id: "evt_10",
      conversationId: "conv_auth_active",
      eventType: "tool_used",
      metadata: { tool_name: "calculator", role: "AUTHENTICATED" },
      createdAt: "2026-03-13 08:20:00",
    });
    seedEvent(db, {
      id: "evt_10b",
      conversationId: "conv_auth_active",
      eventType: "lane_changed",
      metadata: { from_lane: "uncertain", to_lane: "organization" },
      createdAt: "2026-03-13 08:25:00",
    });
    seedEvent(db, {
      id: "evt_11",
      conversationId: "conv_auth_archived",
      eventType: "tool_used",
      metadata: { tool_name: "get_section", role: "STAFF" },
      createdAt: "2026-03-08 08:20:00",
    });
    seedEvent(db, {
      id: "evt_12",
      conversationId: "conv_auth_archived",
      eventType: "archived",
      metadata: { message_count: 4, duration_hours: 24 },
      createdAt: "2026-03-09 08:00:00",
    });
    seedEvent(db, {
      id: "evt_13",
      conversationId: "conv_anon_b",
      eventType: "lane_uncertain",
      metadata: { lane: "uncertain", confidence: 0.33 },
      createdAt: "2026-03-11 09:10:00",
    });
  });

  it("returns overview metrics", async () => {
    const result = await conversationAnalytics(
      { db },
      { metric: "overview", time_range: "all" },
    ) as Record<string, unknown>;

    expect(result.total_conversations).toBe(5);
    expect(result.anonymous_conversations).toBe(2);
    expect(result.authenticated_conversations).toBe(3);
    expect(result.converted_conversations).toBe(1);
    expect(result.avg_message_count).toBeGreaterThan(0);
    expect(result.lane_distribution).toEqual({
      organization: 1,
      individual: 0,
      uncertain: 4,
    });
    expect(result.uncertain_conversations).toBe(4);
    expect(result.lane_changed_events).toBe(1);
    expect(result.lane_uncertain_events).toBe(1);
  });

  it("returns funnel stage counts", async () => {
    const result = await conversationAnalytics(
      { db },
      { metric: "funnel", time_range: "all" },
    ) as { stages: Array<{ name: string; count: number }> };

    expect(result.stages.find((stage) => stage.name === "anonymous_sessions")?.count).toBe(3);
    expect(result.stages.find((stage) => stage.name === "registration")?.count).toBe(1);
  });

  it("returns engagement metrics including return rate", async () => {
    const result = await conversationAnalytics(
      { db },
      { metric: "engagement", time_range: "all" },
    ) as {
      return_rate: number;
      message_count_histogram: Array<{ bucket: string; count: number }>;
      top_conversation_titles: Array<{ title: string }>;
    };

    expect(result.return_rate).toBeGreaterThan(0);
    expect(result.message_count_histogram.some((bucket) => bucket.count > 0)).toBe(true);
    expect(result.top_conversation_titles[0].title).toBe("Ongoing product work");
  });

  it("returns tool usage metrics including tools preceding registration", async () => {
    const result = await conversationAnalytics(
      { db },
      { metric: "tool_usage", time_range: "all" },
    ) as {
      tool_calls_by_name: Record<string, number>;
      tools_preceding_registration: Record<string, number>;
    };

    expect(result.tool_calls_by_name.search_corpus).toBe(1);
    expect(result.tool_calls_by_name.calculator).toBe(1);
    expect(result.tools_preceding_registration.search_my_conversations).toBe(1);
  });

  it("returns drop-off groups with message previews", async () => {
    const realNow = Date.now;
    Date.now = () => new Date("2026-03-20T12:00:00.000Z").getTime();

    try {
      const result = await conversationAnalytics(
        { db },
        { metric: "drop_off", time_range: "all" },
      ) as {
        anonymous: Array<{ conversation_id: string; last_message_preview: string }>;
        authenticated: Array<{ conversation_id: string }>;
      };

      expect(result.anonymous.some((row) => row.conversation_id === "conv_anon_a")).toBe(true);
      expect(result.anonymous[0].last_message_preview.length).toBeGreaterThan(0);
      expect(result.authenticated.some((row) => row.conversation_id === "conv_auth_archived")).toBe(true);
    } finally {
      Date.now = realNow;
    }
  });

  it("inspects a conversation with previews and events", async () => {
    const result = await conversationInspect(
      { db },
      { conversation_id: "conv_converted" },
    ) as {
      conversation: { id: string; lane: string };
      messages: Array<{ content_preview: string }>;
      events: Array<{ event_type: string }>;
      routing_events: { lane_changed_count: number; lane_uncertain_count: number };
    };

    expect(result.conversation.id).toBe("conv_converted");
    expect(result.conversation.lane).toBe("uncertain");
    expect(result.messages[0].content_preview).toContain("Anonymous origin");
    expect(result.events.some((event) => event.event_type === "converted")).toBe(true);
    expect(result.routing_events).toEqual({ lane_changed_count: 0, lane_uncertain_count: 0 });
  });

  it("inspects routing metadata when lane state has been persisted", async () => {
    const result = await conversationInspect(
      { db },
      { conversation_id: "conv_auth_active" },
    ) as {
      conversation: {
        id: string;
        lane: string;
        lane_confidence: number | null;
        recommended_next_step: string | null;
      };
    };

    expect(result.conversation.id).toBe("conv_auth_active");
    expect(result.conversation.lane).toBe("organization");
    expect(result.conversation.lane_confidence).toBe(0.95);
    expect(result.conversation.recommended_next_step).toBe("Move to advisory scoping");
  });

  it("reports routing event counts in conversation inspection", async () => {
    const result = await conversationInspect(
      { db },
      { conversation_id: "conv_auth_active" },
    ) as {
      routing_events: { lane_changed_count: number; lane_uncertain_count: number };
    };

    expect(result.routing_events).toEqual({ lane_changed_count: 1, lane_uncertain_count: 0 });
  });

  it("returns founder review queues for routing operations", async () => {
    seedConversation(db, {
      id: "conv_individual_ready",
      userId: "usr_1",
      title: "Individual coaching follow-up",
      status: "active",
      createdAt: "2026-03-15 09:00:00",
      updatedAt: "2026-03-18 09:00:00",
      messageCount: 5,
      lane: "individual",
      laneConfidence: 0.88,
      recommendedNextStep: "Offer training follow-up",
      detectedNeedSummary: "Solo operator wants implementation coaching.",
      laneLastAnalyzedAt: "2026-03-18 09:05:00",
    });
    seedConversation(db, {
      id: "conv_uncertain_recent",
      userId: "usr_3",
      title: "Needs manual routing review",
      status: "active",
      createdAt: "2026-03-17 12:00:00",
      updatedAt: "2026-03-18 08:55:00",
      messageCount: 3,
      lane: "uncertain",
      laneConfidence: 0.41,
      detectedNeedSummary: "Signals are mixed between personal learning and team workflow.",
      laneLastAnalyzedAt: "2026-03-18 08:58:00",
    });
    seedEvent(db, {
      id: "evt_14",
      conversationId: "conv_uncertain_recent",
      eventType: "lane_uncertain",
      metadata: { lane: "uncertain", confidence: 0.41 },
      createdAt: "2026-03-18 08:58:00",
    });
    seedEvent(db, {
      id: "evt_15",
      conversationId: "conv_individual_ready",
      eventType: "lane_changed",
      metadata: { from_lane: "uncertain", to_lane: "individual" },
      createdAt: "2026-03-18 09:05:00",
    });

    const result = await conversationAnalytics(
      { db },
      { metric: "routing_review", time_range: "all", limit: 2 },
    ) as {
      summary: {
        recently_changed_count: number;
        uncertain_count: number;
        follow_up_ready_count: number;
      };
      recently_changed: Array<{ conversation_id: string; from_lane: string; to_lane: string }>;
      uncertain_conversations: Array<{ conversation_id: string }>;
      follow_up_ready: Array<{ conversation_id: string; lane: string }>;
      limits: { per_queue: number };
    };

    expect(result.limits.per_queue).toBe(2);
    expect(result.summary.recently_changed_count).toBe(2);
    expect(result.summary.uncertain_count).toBe(5);
    expect(result.summary.follow_up_ready_count).toBe(2);
    expect(result.recently_changed[0]).toMatchObject({
      conversation_id: "conv_individual_ready",
      from_lane: "uncertain",
      to_lane: "individual",
    });
    expect(result.uncertain_conversations[0]?.conversation_id).toBe("conv_uncertain_recent");
    expect(result.follow_up_ready.map((row) => row.conversation_id)).toEqual([
      "conv_individual_ready",
      "conv_auth_active",
    ]);
  });

  it("caps routing review queue length to a safe upper bound", async () => {
    const result = await conversationAnalytics(
      { db },
      { metric: "routing_review", time_range: "all", limit: 999 },
    ) as { limits: { per_queue: number } };

    expect(result.limits.per_queue).toBe(50);
  });

  it("compares cohorts and flags low sample size", async () => {
    const result = await conversationCohort(
      { db },
      { cohort_a: "anonymous", cohort_b: "converted", metric: "message_count" },
    ) as {
      cohort_a: { count: number; mean: number };
      cohort_b: { count: number; mean: number };
      low_sample_warning: boolean;
    };

    expect(result.cohort_a.count).toBe(2);
    expect(result.cohort_b.count).toBe(1);
    expect(result.cohort_b.mean).toBe(8);
    expect(result.low_sample_warning).toBe(true);
  });
});