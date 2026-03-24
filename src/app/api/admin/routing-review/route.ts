import type { NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { conversationAnalytics } from "@mcp/analytics-tool";

const VALID_TIME_RANGES = new Set(["24h", "7d", "30d", "all"]);

export async function GET(request: NextRequest) {
  const user = await getSessionUser();

  if (!user.roles.includes("ADMIN")) {
    return Response.json(
      { error: "Routing review is restricted to administrators." },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const requestedTimeRange = url.searchParams.get("timeRange") ?? "30d";
  const rawLimit = url.searchParams.get("limit");

  if (!VALID_TIME_RANGES.has(requestedTimeRange)) {
    return Response.json(
      { error: "timeRange must be one of 24h, 7d, 30d, or all." },
      { status: 400 },
    );
  }

  let limit: number | undefined;
  if (rawLimit != null) {
    const parsedLimit = Number.parseInt(rawLimit, 10);

    if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
      return Response.json(
        { error: "limit must be a positive integer." },
        { status: 400 },
      );
    }

    limit = parsedLimit;
  }

  const review = await conversationAnalytics(
    { db: getDb() },
    {
      metric: "routing_review",
      time_range: requestedTimeRange as "24h" | "7d" | "30d" | "all",
      limit,
    },
  );

  return Response.json(review);
}