import type { ConversationRepository } from "@/core/use-cases/ConversationRepository";
import type { MessageRepository } from "@/core/use-cases/MessageRepository";
import type { Message } from "@/core/entities/conversation";
import type { JobEvent, JobRequest } from "@/core/entities/job";
import type { JobStatusMessagePart, MessagePart } from "@/core/entities/message-parts";
import { getJobMessageId } from "./job-status";
import { buildJobPublication } from "./job-publication";

function isJobStatusPart(part: MessagePart): part is JobStatusMessagePart {
  return part.type === "job_status";
}

function replaceJobStatusPart(parts: MessagePart[] | undefined, nextPart: JobStatusMessagePart): MessagePart[] {
  const preserved = (parts ?? []).filter((part) => !isJobStatusPart(part));
  return [...preserved, nextPart];
}

function isTerminalEvent(eventType: JobEvent["eventType"]): boolean {
  return eventType === "result" || eventType === "failed" || eventType === "canceled";
}

export class DeferredJobConversationProjector {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
  ) {}

  async project(job: JobRequest, event: JobEvent): Promise<Message> {
    const { part: nextPart } = buildJobPublication(job, event);
    const existing = await this.findExistingMessage(job.conversationId, job.id);

    if (isTerminalEvent(event.eventType)) {
      if (existing) {
        const updated = await this.messageRepo.update(existing.id, {
          content: "",
          parts: replaceJobStatusPart(existing.parts, nextPart),
        });
        await this.conversationRepo.touch(job.conversationId);
        return updated;
      }

      const created = await this.messageRepo.create({
        conversationId: job.conversationId,
        role: "assistant",
        content: "",
        parts: [nextPart],
      });
      await this.conversationRepo.recordMessageAppended(job.conversationId, created.createdAt);
      return created;
    }

    if (existing) {
      const updated = await this.messageRepo.update(existing.id, {
        content: "",
        parts: replaceJobStatusPart(existing.parts, nextPart),
      });
      await this.conversationRepo.touch(job.conversationId);
      return updated;
    }

    const created = await this.messageRepo.create({
      conversationId: job.conversationId,
      role: "assistant",
      content: "",
      parts: [nextPart],
    });
    await this.conversationRepo.recordMessageAppended(job.conversationId, created.createdAt);
    return created;
  }

  private async findExistingMessage(conversationId: string, jobId: string): Promise<Message | null> {
    const deterministicId = getJobMessageId(jobId);
    const direct = await this.messageRepo.findById(deterministicId);
    if (direct) {
      return direct;
    }

    const messages = await this.messageRepo.listByConversation(conversationId);
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.parts.some((part) => isJobStatusPart(part) && part.jobId === jobId)) {
        return message;
      }
    }

    return null;
  }
}