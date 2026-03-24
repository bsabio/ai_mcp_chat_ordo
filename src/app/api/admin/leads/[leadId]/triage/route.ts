import type { NextRequest } from "next/server";

import type { LeadTriageState } from "@/core/entities/lead-record";
import { getSessionUser } from "@/lib/auth";
import { getLeadRecordRepository } from "@/lib/chat/conversation-root";

const VALID_TRIAGE_STATES = new Set<LeadTriageState>([
  "new",
  "contacted",
  "qualified",
  "deferred",
]);

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isValidIsoTimestamp(value: string): boolean {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ leadId: string }> },
) {
  const user = await getSessionUser();

  if (!user.roles.includes("ADMIN")) {
    return Response.json(
      { error: "Lead triage is restricted to administrators." },
      { status: 403 },
    );
  }

  const { leadId } = await context.params;

  if (!leadId) {
    return Response.json(
      { error: "leadId is required." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    triageState?: unknown;
    founderNote?: unknown;
    lastContactedAt?: unknown;
  } | null;
  const triageState = typeof body?.triageState === "string" ? body.triageState : "";
  const founderNote = normalizeOptionalString(body?.founderNote);
  const lastContactedAt = normalizeOptionalString(body?.lastContactedAt);

  if (!VALID_TRIAGE_STATES.has(triageState as LeadTriageState)) {
    return Response.json(
      { error: "triageState must be one of new, contacted, qualified, or deferred." },
      { status: 400 },
    );
  }

  if (founderNote && founderNote.length > 1000) {
    return Response.json(
      { error: "founderNote must be 1000 characters or fewer." },
      { status: 400 },
    );
  }

  if (lastContactedAt && !isValidIsoTimestamp(lastContactedAt)) {
    return Response.json(
      { error: "lastContactedAt must be a valid ISO timestamp." },
      { status: 400 },
    );
  }

  if (triageState === "contacted" && !lastContactedAt) {
    return Response.json(
      { error: "lastContactedAt is required when triageState is contacted." },
      { status: 400 },
    );
  }

  if (triageState === "deferred" && !founderNote) {
    return Response.json(
      { error: "founderNote is required when triageState is deferred." },
      { status: 400 },
    );
  }

  const repo = getLeadRecordRepository();
  const existing = await repo.findById(leadId);

  if (!existing || existing.captureStatus !== "submitted") {
    return Response.json(
      { error: "Submitted lead not found." },
      { status: 404 },
    );
  }

  const leadRecord = await repo.updateTriageState(leadId, triageState as LeadTriageState, {
    founderNote,
    lastContactedAt,
  });

  return Response.json({
    ok: true,
    leadRecord,
  });
}