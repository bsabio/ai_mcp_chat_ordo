import { NextResponse } from "next/server";
import type { JobEvent, JobRequest } from "@/core/entities/job";
import {
  buildJobStatusPartFromProjection,
  projectJobForEvent,
} from "@/lib/jobs/job-status";

export interface JobEventStreamOptions {
  request: Request;
  requestId: string;
  initialAfterSequence: number;
  pollIntervalMs: number;
  streamWindowMs: number;
  batchLimit: number;
  listEvents: (afterSequence: number, limit: number) => Promise<JobEvent[]>;
  findJobById: (jobId: string) => Promise<JobRequest | null>;
}

export function encodeJobEvent(sequence: number, payload: Record<string, unknown>): string {
  return `id: ${sequence}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export function mapJobEventPayload(job: JobRequest, event: JobEvent): Record<string, unknown> {
  const part = buildJobStatusPartFromProjection(projectJobForEvent(job, event), event);
  const base = {
    jobId: job.id,
    conversationId: job.conversationId,
    sequence: event.sequence,
    toolName: job.toolName,
    label: part.label,
    title: part.title,
    subtitle: part.subtitle,
    updatedAt: event.createdAt,
  };

  switch (event.eventType) {
    case "queued":
      return { type: "job_queued", ...base };
    case "started":
      return { type: "job_started", ...base };
    case "progress":
      return {
        type: "job_progress",
        ...base,
        progressPercent: part.progressPercent,
        progressLabel: part.progressLabel,
      };
    case "result":
      return {
        type: "job_completed",
        ...base,
        summary: part.summary,
        resultPayload: part.resultPayload,
      };
    case "failed":
      return {
        type: "job_failed",
        ...base,
        error: part.error ?? "Deferred job failed.",
      };
    case "canceled":
      return {
        type: "job_canceled",
        ...base,
      };
    default:
      return {
        type: "job_progress",
        ...base,
        progressPercent: part.progressPercent,
        progressLabel: part.progressLabel,
      };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createJobEventStreamResponse(options: JobEventStreamOptions): NextResponse {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let afterSequence = options.initialAfterSequence;
      const startedAt = Date.now();

      controller.enqueue(encoder.encode(`retry: ${options.pollIntervalMs}\n\n`));

      while (!options.request.signal.aborted && Date.now() - startedAt < options.streamWindowMs) {
        const events = await options.listEvents(afterSequence, options.batchLimit);

        if (events.length === 0) {
          await sleep(options.pollIntervalMs);
          continue;
        }

        for (const event of events) {
          const job = await options.findJobById(event.jobId);
          if (!job) {
            afterSequence = event.sequence;
            continue;
          }

          controller.enqueue(
            encoder.encode(encodeJobEvent(event.sequence, mapJobEventPayload(job, event))),
          );
          afterSequence = event.sequence;
        }
      }

      controller.close();
    },
    cancel() {
      options.request.signal.throwIfAborted?.();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "x-request-id": options.requestId,
    },
  });
}