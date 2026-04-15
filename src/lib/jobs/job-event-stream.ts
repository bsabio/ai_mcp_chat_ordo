import { NextResponse } from "next/server";
import type { JobEvent, JobRequest } from "@/core/entities/job";
import {
  buildJobPublication,
  publicationToStreamEvent,
} from "@/lib/jobs/job-publication";
import { isRenderableJobEventType } from "@/lib/jobs/job-renderable-event";

export interface JobEventStreamOptions {
  request: Request;
  requestId: string;
  initialAfterSequence: number;
  pollIntervalMs: number;
  streamWindowMs: number;
  batchLimit: number;
  listEvents: (afterSequence: number, limit: number) => Promise<JobEvent[]>;
  findJobById: (jobId: string) => Promise<JobRequest | null>;
  findLatestRenderableEventForJob?: (jobId: string) => Promise<JobEvent | null>;
}

export function encodeJobEvent(sequence: number, payload: Record<string, unknown>): string {
  return `id: ${sequence}\ndata: ${JSON.stringify(payload)}\n\n`;
}

/**
 * Build the SSE payload for a single job event, using the unified publication contract.
 */
export function mapJobEventPayload(
  job: JobRequest,
  event: JobEvent,
  renderableEvent?: JobEvent | null,
): Record<string, unknown> {
  const publication = buildJobPublication(job, event, renderableEvent);

  return publicationToStreamEvent(publication, job, { sequence: event.sequence });
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
      let hasPolledBacklog = false;

      controller.enqueue(encoder.encode(`retry: ${options.pollIntervalMs}\n\n`));

      while (
        !options.request.signal.aborted
        && (!hasPolledBacklog || Date.now() - startedAt < options.streamWindowMs)
      ) {
        const events = await options.listEvents(afterSequence, options.batchLimit);
        hasPolledBacklog = true;

        if (events.length === 0) {
          if (Date.now() - startedAt >= options.streamWindowMs) {
            break;
          }

          await sleep(options.pollIntervalMs);
          continue;
        }

        for (const event of events) {
          const job = await options.findJobById(event.jobId);
          if (!job) {
            afterSequence = event.sequence;
            continue;
          }

          const renderableEvent = isRenderableJobEventType(event.eventType)
            ? event
            : await options.findLatestRenderableEventForJob?.(event.jobId);

          controller.enqueue(
            encoder.encode(encodeJobEvent(event.sequence, mapJobEventPayload(job, event, renderableEvent))),
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