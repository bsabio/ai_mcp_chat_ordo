import { getDb } from "../db";
import { ConversationDataMapper } from "../../adapters/ConversationDataMapper";
import { MessageDataMapper } from "../../adapters/MessageDataMapper";
import { ConversationEventDataMapper } from "../../adapters/ConversationEventDataMapper";
import { LeadRecordDataMapper } from "../../adapters/LeadRecordDataMapper";
import { ConsultationRequestDataMapper } from "../../adapters/ConsultationRequestDataMapper";
import { DealRecordDataMapper } from "../../adapters/DealRecordDataMapper";
import { TrainingPathRecordDataMapper } from "../../adapters/TrainingPathRecordDataMapper";
import { ConversationInteractor } from "../../core/use-cases/ConversationInteractor";
import { ConversationEventRecorder } from "../../core/use-cases/ConversationEventRecorder";
import { LeadCaptureInteractor } from "../../core/use-cases/LeadCaptureInteractor";
import { RequestConsultationInteractor } from "../../core/use-cases/RequestConsultationInteractor";
import { TriageConsultationRequestInteractor } from "../../core/use-cases/TriageConsultationRequestInteractor";
import { CreateDealFromWorkflowInteractor } from "../../core/use-cases/CreateDealFromWorkflowInteractor";
import { CreateTrainingPathFromWorkflowInteractor } from "../../core/use-cases/CreateTrainingPathFromWorkflowInteractor";
import { SummarizationInteractor } from "../../core/use-cases/SummarizationInteractor";
import { AnthropicSummarizer } from "../../adapters/AnthropicSummarizer";
import { getAnthropicApiKey, getModelFallbacks } from "../config/env";
import {
  HeuristicConversationRoutingAnalyzer,
  type ConversationRoutingAnalyzer,
} from "./routing-analysis";

type ChatPersistence = {
  conversationRepo: ConversationDataMapper;
  messageRepo: MessageDataMapper;
};

type WorkflowRepositories = {
  consultationRequestRepo: ConsultationRequestDataMapper;
  leadRecordRepo: LeadRecordDataMapper;
  dealRecordRepo: DealRecordDataMapper;
  trainingPathRecordRepo: TrainingPathRecordDataMapper;
};

function createConversationPersistence(): ChatPersistence {
  // These builders remain request-scoped around the shared DB handle.
  const db = getDb();

  return {
    conversationRepo: new ConversationDataMapper(db),
    messageRepo: new MessageDataMapper(db),
  };
}

function createEventRecorder(): ConversationEventRecorder {
  // Event recording stays lightweight enough to construct per request.
  const db = getDb();
  const eventRepo = new ConversationEventDataMapper(db);
  return new ConversationEventRecorder(eventRepo);
}

function createWorkflowRepositories(): WorkflowRepositories {
  // Workflow repositories are grouped here so getters stop rewiring them ad hoc.
  const db = getDb();

  return {
    consultationRequestRepo: new ConsultationRequestDataMapper(db),
    leadRecordRepo: new LeadRecordDataMapper(db),
    dealRecordRepo: new DealRecordDataMapper(db),
    trainingPathRecordRepo: new TrainingPathRecordDataMapper(db),
  };
}

function createConversationSummarizer(): AnthropicSummarizer {
  return new AnthropicSummarizer(
    getAnthropicApiKey(),
    getModelFallbacks()[0] ?? "",
  );
}

export type ConversationRuntimeServices = {
  interactor: ConversationInteractor;
  routingAnalyzer: ConversationRoutingAnalyzer;
  summarizationInteractor: SummarizationInteractor;
};

export type ConversationRouteServices = {
  interactor: ConversationInteractor;
};

export function createConversationRouteServices(): ConversationRouteServices {
  return {
    interactor: getConversationInteractor(),
  };
}

export function createConversationRuntimeServices(): ConversationRuntimeServices {
  const { conversationRepo, messageRepo } = createConversationPersistence();
  const eventRecorder = createEventRecorder();

  return {
    interactor: new ConversationInteractor(
      conversationRepo,
      messageRepo,
      eventRecorder,
    ),
    routingAnalyzer: new HeuristicConversationRoutingAnalyzer(),
    summarizationInteractor: new SummarizationInteractor(
      messageRepo,
      createConversationSummarizer(),
      eventRecorder,
    ),
  };
}

export function getConversationInteractor(): ConversationInteractor {
  const { conversationRepo, messageRepo } = createConversationPersistence();
  const eventRecorder = createEventRecorder();
  return new ConversationInteractor(conversationRepo, messageRepo, eventRecorder);
}

export function getSummarizationInteractor(): SummarizationInteractor {
  const { messageRepo } = createConversationPersistence();
  const eventRecorder = createEventRecorder();
  const summarizer = createConversationSummarizer();
  return new SummarizationInteractor(messageRepo, summarizer, eventRecorder);
}

export function getLeadCaptureInteractor(): LeadCaptureInteractor {
  const { leadRecordRepo } = createWorkflowRepositories();
  const { conversationRepo } = createConversationPersistence();
  const eventRecorder = createEventRecorder();
  return new LeadCaptureInteractor(leadRecordRepo, conversationRepo, eventRecorder);
}

export function getLeadRecordRepository(): LeadRecordDataMapper {
  return createWorkflowRepositories().leadRecordRepo;
}

export function getConsultationRequestRepository(): ConsultationRequestDataMapper {
  return createWorkflowRepositories().consultationRequestRepo;
}

export function getDealRecordRepository(): DealRecordDataMapper {
  return createWorkflowRepositories().dealRecordRepo;
}

export function getTrainingPathRecordRepository(): TrainingPathRecordDataMapper {
  return createWorkflowRepositories().trainingPathRecordRepo;
}

export function getRequestConsultationInteractor(): RequestConsultationInteractor {
  const { consultationRequestRepo } = createWorkflowRepositories();
  const { conversationRepo } = createConversationPersistence();
  const eventRecorder = createEventRecorder();
  return new RequestConsultationInteractor(consultationRequestRepo, conversationRepo, eventRecorder);
}

export function getTriageConsultationRequestInteractor(): TriageConsultationRequestInteractor {
  const { consultationRequestRepo } = createWorkflowRepositories();
  const eventRecorder = createEventRecorder();
  return new TriageConsultationRequestInteractor(consultationRequestRepo, eventRecorder);
}

export function getCreateDealFromWorkflowInteractor(): CreateDealFromWorkflowInteractor {
  const { dealRecordRepo, consultationRequestRepo, leadRecordRepo } = createWorkflowRepositories();
  const { conversationRepo } = createConversationPersistence();
  const eventRecorder = createEventRecorder();
  return new CreateDealFromWorkflowInteractor(
    dealRecordRepo,
    consultationRequestRepo,
    leadRecordRepo,
    conversationRepo,
    eventRecorder,
  );
}

export function getCreateTrainingPathFromWorkflowInteractor(): CreateTrainingPathFromWorkflowInteractor {
  const { trainingPathRecordRepo, consultationRequestRepo, leadRecordRepo } = createWorkflowRepositories();
  const { conversationRepo } = createConversationPersistence();
  const eventRecorder = createEventRecorder();
  return new CreateTrainingPathFromWorkflowInteractor(
    trainingPathRecordRepo,
    consultationRequestRepo,
    leadRecordRepo,
    conversationRepo,
    eventRecorder,
  );
}

export function getConversationEventRecorder(): ConversationEventRecorder {
  return createEventRecorder();
}

export function getConversationRoutingAnalyzer(): ConversationRoutingAnalyzer {
  return new HeuristicConversationRoutingAnalyzer();
}
