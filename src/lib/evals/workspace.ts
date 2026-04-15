import Database from "better-sqlite3";

import { ConsultationRequestDataMapper } from "@/adapters/ConsultationRequestDataMapper";
import { ConversationDataMapper } from "@/adapters/ConversationDataMapper";
import { ConversationEventDataMapper } from "@/adapters/ConversationEventDataMapper";
import { DealRecordDataMapper } from "@/adapters/DealRecordDataMapper";
import { LeadRecordDataMapper } from "@/adapters/LeadRecordDataMapper";
import { MessageDataMapper } from "@/adapters/MessageDataMapper";
import { TrainingPathRecordDataMapper } from "@/adapters/TrainingPathRecordDataMapper";
import { ConversationEventRecorder } from "@/core/use-cases/ConversationEventRecorder";
import { CreateDealFromWorkflowInteractor } from "@/core/use-cases/CreateDealFromWorkflowInteractor";
import { CreateTrainingPathFromWorkflowInteractor } from "@/core/use-cases/CreateTrainingPathFromWorkflowInteractor";
import type { CalculatorResult } from "@/lib/calculator";
import { ensureSchema } from "@/lib/db/schema";
import { executeCalculatorTool, type CalculatorToolArgs } from "@/lib/capabilities/shared/calculator-tool";

type MessageRole = "user" | "assistant" | "system";

export interface EvalWorkspaceUserSeed {
  id: string;
  email: string;
  name: string;
}

export interface EvalWorkspaceConversationSeed {
  id: string;
  userId: string;
  title: string;
  sessionSource: string;
  lane: "organization" | "individual" | "development" | "uncertain";
  confidence: number;
  recommendedNextStep: string;
  detectedNeedSummary: string;
  lastAnalyzedAt: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    role: MessageRole;
    content: string;
    createdAt: string;
  }>;
  convertedFrom?: string | null;
  lastToolUsed?: string | null;
}

export interface EvalWorkspaceLeadSeed {
  conversationId: string;
  lane: "organization" | "individual" | "development" | "uncertain";
  name: string;
  email: string;
  organization: string | null;
  roleOrTitle: string | null;
  trainingGoal: string | null;
  problemSummary: string;
  recommendedNextAction: string;
  qualification?: {
    authorityLevel?: "decision_maker" | "influencer" | "evaluator" | "unknown" | null;
    urgency?: "immediate" | "this_quarter" | "exploring" | "unknown" | null;
    budgetSignal?: "confirmed" | "likely" | "unclear" | "none" | null;
    technicalEnvironment?: string | null;
    trainingFit?: "beginner" | "intermediate" | "advanced" | "career_transition" | "unknown" | null;
  };
  triageState?: "new" | "contacted" | "qualified" | "deferred";
  founderNote?: string | null;
}

export interface EvalWorkspaceConsultationRequestSeed {
  conversationId: string;
  userId: string;
  lane: "organization" | "individual" | "development" | "uncertain";
  requestSummary: string;
  status?: "pending" | "reviewed" | "scheduled" | "declined";
  founderNote?: string | null;
}

export interface EvalWorkspaceDealSeed {
  conversationId: string;
  consultationRequestId: string | null;
  leadRecordId: string | null;
  userId: string;
  lane: "organization" | "development";
  title: string;
  organizationName: string | null;
  problemSummary: string;
  proposedScope: string;
  recommendedServiceType: string;
  estimatedHours: number | null;
  estimatedTrainingDays: number | null;
  estimatedPrice: number | null;
  status?: "draft" | "qualified" | "estimate_ready" | "agreed" | "declined" | "on_hold";
  nextAction: string | null;
  assumptions: string | null;
  openQuestions: string | null;
  founderNote: string | null;
  customerResponseNote: string | null;
}

export interface EvalWorkspaceTrainingPathSeed {
  conversationId: string;
  leadRecordId: string | null;
  consultationRequestId: string | null;
  userId: string;
  currentRoleOrBackground: string | null;
  technicalDepth: string | null;
  primaryGoal: string | null;
  preferredFormat: string | null;
  apprenticeshipInterest: "yes" | "maybe" | "no" | "unknown" | null;
  recommendedPath?: "operator_intensive" | "operator_lab" | "mentorship_sprint" | "apprenticeship_screening" | "continue_conversation";
  fitRationale: string | null;
  customerSummary: string | null;
  status?: "draft" | "recommended" | "screening_requested" | "deferred" | "closed";
  nextAction: string | null;
  founderNote: string | null;
}

export interface EvalWorkspaceConversationEventRecord {
  id: string;
  type: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface EvalWorkspaceConversationEventSeed {
  id?: string;
  conversationId: string;
  type: string;
  metadata: Record<string, unknown>;
  createdAt?: string;
}

export interface EvalWorkspaceMessageAppend {
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt?: string;
}

export interface EvalWorkspace {
  db: Database.Database;
  conversationRepo: ConversationDataMapper;
  messageRepo: MessageDataMapper;
  leadRepo: LeadRecordDataMapper;
  consultationRequestRepo: ConsultationRequestDataMapper;
  dealRepo: DealRecordDataMapper;
  trainingPathRepo: TrainingPathRecordDataMapper;
  conversationEventRepo: ConversationEventDataMapper;
  dealWorkflow: CreateDealFromWorkflowInteractor;
  trainingWorkflow: CreateTrainingPathFromWorkflowInteractor;
  seedUser(user: EvalWorkspaceUserSeed): Promise<void>;
  seedConversation(seed: EvalWorkspaceConversationSeed): Promise<void>;
  seedConversationEvent(seed: EvalWorkspaceConversationEventSeed): Promise<void>;
  seedLead(seed: EvalWorkspaceLeadSeed): Promise<string>;
  seedConsultationRequest(seed: EvalWorkspaceConsultationRequestSeed): Promise<string>;
  seedDeal(seed: EvalWorkspaceDealSeed): Promise<string>;
  seedTrainingPath(seed: EvalWorkspaceTrainingPathSeed): Promise<string>;
  appendMessage(message: EvalWorkspaceMessageAppend): Promise<void>;
  listMessages(conversationId: string): Promise<Array<{ role: MessageRole; content: string; createdAt: string }>>;
  listConversationEvents(conversationId: string): Promise<EvalWorkspaceConversationEventRecord[]>;
  executeCalculator(args: CalculatorToolArgs): CalculatorResult;
  destroy(): void;
}

export function createEvalWorkspace(): EvalWorkspace {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  ensureSchema(db);

  const conversationRepo = new ConversationDataMapper(db);
  const messageRepo = new MessageDataMapper(db);
  const leadRepo = new LeadRecordDataMapper(db);
  const consultationRequestRepo = new ConsultationRequestDataMapper(db);
  const dealRepo = new DealRecordDataMapper(db);
  const trainingPathRepo = new TrainingPathRecordDataMapper(db);
  const conversationEventRepo = new ConversationEventDataMapper(db);
  const eventRecorder = new ConversationEventRecorder(conversationEventRepo);

  return {
    db,
    conversationRepo,
    messageRepo,
    leadRepo,
    consultationRequestRepo,
    dealRepo,
    trainingPathRepo,
    conversationEventRepo,
    dealWorkflow: new CreateDealFromWorkflowInteractor(
      dealRepo,
      consultationRequestRepo,
      leadRepo,
      conversationRepo,
      eventRecorder,
    ),
    trainingWorkflow: new CreateTrainingPathFromWorkflowInteractor(
      trainingPathRepo,
      consultationRequestRepo,
      leadRepo,
      conversationRepo,
      eventRecorder,
    ),
    async seedUser(user) {
      db.prepare(`INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`)
        .run(user.id, user.email, user.name);
    },
    async seedConversation(seed) {
      await conversationRepo.create({
        id: seed.id,
        userId: seed.userId,
        title: seed.title,
        sessionSource: seed.sessionSource,
      });

      db.prepare(
        `UPDATE conversations SET created_at = ?, updated_at = ? WHERE id = ?`,
      ).run(seed.createdAt, seed.updatedAt, seed.id);

      await conversationRepo.updateRoutingSnapshot(seed.id, {
        lane: seed.lane,
        confidence: seed.confidence,
        recommendedNextStep: seed.recommendedNextStep,
        detectedNeedSummary: seed.detectedNeedSummary,
        lastAnalyzedAt: seed.lastAnalyzedAt,
      });

      if (seed.convertedFrom) {
        await conversationRepo.setConvertedFrom(seed.id, seed.convertedFrom);
      }

      if (seed.lastToolUsed) {
        await conversationRepo.setLastToolUsed(seed.id, seed.lastToolUsed);
      }

      for (const message of seed.messages) {
        const created = await messageRepo.create({
          conversationId: seed.id,
          role: message.role,
          content: message.content,
          parts: [],
        });

        db.prepare(`UPDATE messages SET id = ?, created_at = ? WHERE id = ?`)
          .run(message.id, message.createdAt, created.id);
      }

      const firstMessage = seed.messages[0];
      if (firstMessage) {
        await conversationRepo.setFirstMessageAt(seed.id, firstMessage.createdAt);
      }

      db.prepare(
        `UPDATE conversations SET message_count = ?, updated_at = ? WHERE id = ?`,
      ).run(seed.messages.length, seed.updatedAt, seed.id);
    },
    async seedConversationEvent(seed) {
      const id = seed.id ?? `evt_${crypto.randomUUID()}`;
      const createdAt = seed.createdAt ?? new Date().toISOString();
      db.prepare(
        `INSERT INTO conversation_events (id, conversation_id, event_type, metadata, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(id, seed.conversationId, seed.type, JSON.stringify(seed.metadata), createdAt);
    },
    async seedLead(seed) {
      const created = await leadRepo.submitCapture({
        conversationId: seed.conversationId,
        lane: seed.lane,
        name: seed.name,
        email: seed.email,
        organization: seed.organization,
        roleOrTitle: seed.roleOrTitle,
        trainingGoal: seed.trainingGoal,
        problemSummary: seed.problemSummary,
        recommendedNextAction: seed.recommendedNextAction,
      });

      if (seed.qualification) {
        await leadRepo.updateQualification(created.id, seed.qualification);
      }

      const triaged = seed.triageState
        ? await leadRepo.updateTriageState(created.id, seed.triageState, { founderNote: seed.founderNote ?? null })
        : created;

      return triaged?.id ?? created.id;
    },
    async seedConsultationRequest(seed) {
      const created = await consultationRequestRepo.create({
        conversationId: seed.conversationId,
        userId: seed.userId,
        lane: seed.lane,
        requestSummary: seed.requestSummary,
      });

      const updated = seed.status
        ? await consultationRequestRepo.updateStatus(created.id, seed.status, { founderNote: seed.founderNote ?? null })
        : created;

      return updated?.id ?? created.id;
    },
    async seedDeal(seed) {
      const deal = await dealRepo.create(seed);
      return deal.id;
    },
    async seedTrainingPath(seed) {
      const created = await trainingPathRepo.create(seed);
      if (seed.status && seed.status !== created.status) {
        await trainingPathRepo.updateStatus(created.id, seed.status, { founderNote: seed.founderNote });
      }
      return created.id;
    },
    async appendMessage(message) {
      const created = await messageRepo.create({
        conversationId: message.conversationId,
        role: message.role,
        content: message.content,
        parts: message.content.length > 0 ? [{ type: "text", text: message.content }] : [],
      });

      if (message.createdAt) {
        db.prepare(`UPDATE messages SET created_at = ? WHERE id = ?`).run(message.createdAt, created.id);
        await conversationRepo.setFirstMessageAt(message.conversationId, message.createdAt);
        db.prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`).run(message.createdAt, message.conversationId);
      } else {
        await conversationRepo.touch(message.conversationId);
      }

      await conversationRepo.incrementMessageCount(message.conversationId);
    },
    async listMessages(conversationId) {
      const messages = await messageRepo.listByConversation(conversationId);
      return messages.map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      }));
    },
    async listConversationEvents(conversationId) {
      const rows = db.prepare(
        `SELECT id, event_type, metadata, created_at FROM conversation_events WHERE conversation_id = ? ORDER BY created_at ASC`,
      ).all(conversationId) as Array<{ id: string; event_type: string; metadata: string; created_at: string }>;

      return rows.map((row) => ({
        id: row.id,
        type: row.event_type,
        metadata: JSON.parse(row.metadata) as Record<string, unknown>,
        createdAt: row.created_at,
      }));
    },
    executeCalculator(args) {
      return executeCalculatorTool(args);
    },
    destroy() {
      db.close();
    },
  };
}