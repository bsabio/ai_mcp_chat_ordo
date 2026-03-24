import type { Conversation, Message } from "@/core/entities/conversation";
import {
  createConversationRoutingSnapshot,
  type ConversationLane,
  type ConversationRoutingSnapshot,
} from "@/core/entities/conversation-routing";

export interface ConversationRoutingAnalyzer {
  analyze(input: {
    conversation: Conversation;
    messages: Message[];
    latestUserText: string;
  }): Promise<ConversationRoutingSnapshot>;
}

type ScoredLane = Exclude<ConversationLane, "uncertain">;

const ORGANIZATION_SIGNALS = [
  "team",
  "company",
  "organization",
  "business",
  "department",
  "workflow",
  "process",
  "staff",
  "leadership",
  "operations",
  "client delivery",
  "internal",
  "cross-functional",
  "our company",
  "my team",
  "employees",
  "manager",
  "advisory",
  "enablement",
];

const INDIVIDUAL_SIGNALS = [
  "i want to learn",
  "teach me",
  "mentor",
  "mentorship",
  "apprenticeship",
  "training",
  "career",
  "portfolio",
  "job search",
  "freelancer",
  "solo",
  "personal practice",
  "student",
  "coach me",
  "operator",
  "individual",
];

const DEVELOPMENT_SIGNALS = [
  "build",
  "implement",
  "implementation",
  "develop",
  "development",
  "integrate",
  "integration",
  "ship",
  "prototype",
  "platform",
  "automation",
  "technical",
  "engineering",
  "codebase",
  "api",
  "deployment",
  "infrastructure",
  "mvp",
  "delivery",
  "feasibility",
];

const ORGANIZATION_PHRASES = ["our team", "our org", "our organization", "for our company"];
const INDIVIDUAL_PHRASES = ["for myself", "on my own", "by myself", "for my career"];
const DEVELOPMENT_PHRASES = [
  "build this",
  "build it",
  "implement this",
  "ship this",
  "integrate with",
  "technical environment",
  "delivery scope",
  "automation workflow",
];

const CLARIFYING_NEXT_STEP = "Ask one clarifying question to determine whether the need is a customer workflow, technical implementation, or training outcome.";
const MIXED_SIGNALS_SUMMARY = "Current signals are mixed across workflow, implementation, and training needs.";

export class HeuristicConversationRoutingAnalyzer implements ConversationRoutingAnalyzer {
  async analyze(input: {
    conversation: Conversation;
    messages: Message[];
    latestUserText: string;
  }): Promise<ConversationRoutingSnapshot> {
    const analyzedAt = new Date().toISOString();
    const corpus = buildAnalysisCorpus(input.messages, input.latestUserText);
    const scores: Record<ScoredLane, number> = {
      organization: scoreSignals(corpus, ORGANIZATION_SIGNALS, ORGANIZATION_PHRASES),
      individual: scoreSignals(corpus, INDIVIDUAL_SIGNALS, INDIVIDUAL_PHRASES),
      development: scoreSignals(corpus, DEVELOPMENT_SIGNALS, DEVELOPMENT_PHRASES),
    };
    const rankedScores = rankScores(scores);
    const [topLane, topScore] = rankedScores[0];
    const [, secondScore] = rankedScores[1];
    const previous = input.conversation.routingSnapshot;

    if (topScore === 0) {
      if (previous.lane !== "uncertain") {
        return createConversationRoutingSnapshot({
          ...previous,
          confidence: previous.confidence ?? 0.58,
          lastAnalyzedAt: analyzedAt,
        });
      }

      return createConversationRoutingSnapshot({
        lane: "uncertain",
        confidence: 0.24,
        recommendedNextStep: CLARIFYING_NEXT_STEP,
        detectedNeedSummary: "Current signals are insufficient to determine whether the need is a workflow question, implementation task, or training need.",
        lastAnalyzedAt: analyzedAt,
      });
    }

    const difference = topScore - secondScore;

    if (difference <= 1) {
      if (previous.lane !== "uncertain" && scores[previous.lane] >= secondScore) {
        const priorScore = scores[previous.lane];

        if (priorScore > 0) {
          return createConversationRoutingSnapshot({
            lane: previous.lane,
            confidence: clampConfidence(0.56 + priorScore * 0.04),
            recommendedNextStep: recommendedNextStepFor(previous.lane),
            detectedNeedSummary: summaryFor(previous.lane, "mixed", corpus),
            lastAnalyzedAt: analyzedAt,
          });
        }
      }

      return createConversationRoutingSnapshot({
        lane: "uncertain",
        confidence: clampConfidence(0.4 + topScore * 0.03),
        recommendedNextStep: CLARIFYING_NEXT_STEP,
        detectedNeedSummary: MIXED_SIGNALS_SUMMARY,
        lastAnalyzedAt: analyzedAt,
      });
    }

    return createConversationRoutingSnapshot({
      lane: topLane,
      confidence: clampConfidence(0.58 + topScore * 0.06 + difference * 0.03),
      recommendedNextStep: recommendedNextStepFor(topLane),
      detectedNeedSummary: summaryFor(topLane, "clear", corpus),
      lastAnalyzedAt: analyzedAt,
    });
  }
}

function rankScores(scores: Record<ScoredLane, number>): Array<[ScoredLane, number]> {
  return (Object.entries(scores) as Array<[ScoredLane, number]>)
    .sort((left, right) => right[1] - left[1]);
}

function buildAnalysisCorpus(messages: Message[], latestUserText: string): string {
  const recentUserText = messages
    .filter((message) => message.role === "user")
    .slice(-6)
    .map((message) => message.content.trim())
    .filter(Boolean);

  return [...recentUserText, latestUserText.trim()]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function scoreSignals(corpus: string, terms: string[], strongPhrases: string[]): number {
  let score = 0;

  for (const term of terms) {
    if (corpus.includes(term)) {
      score += 1;
    }
  }

  for (const phrase of strongPhrases) {
    if (corpus.includes(phrase)) {
      score += 2;
    }
  }

  return score;
}

function clampConfidence(value: number): number {
  return Math.max(0.2, Math.min(0.96, Math.round(value * 100) / 100));
}

function recommendedNextStepFor(lane: ConversationLane): string {
  switch (lane) {
    case "organization":
      return "Frame the next response around advisory scoping, workflow architecture, and organizational discovery.";
    case "individual":
      return "Frame the next response around training fit, mentorship, and a realistic individual learning path.";
    case "development":
      return "Frame the next response around delivery scope, technical feasibility, and the implementation environment.";
    case "uncertain":
      return CLARIFYING_NEXT_STEP;
  }
}

function summaryFor(lane: ConversationLane, confidenceShape: "clear" | "mixed", corpus: string): string {
  const mentions = extractMentions(corpus, lane);

  if (lane === "organization") {
    return confidenceShape === "mixed"
      ? `Signals still lean organizational despite mixed cues${mentions ? `: ${mentions}.` : "."}`
      : `Signals point to an organizational workflow or team enablement need${mentions ? `: ${mentions}.` : "."}`;
  }

  if (lane === "individual") {
    return confidenceShape === "mixed"
      ? `Signals still lean individual despite mixed cues${mentions ? `: ${mentions}.` : "."}`
      : `Signals point to an individual training or mentorship need${mentions ? `: ${mentions}.` : "."}`;
  }

  if (lane === "development") {
    return confidenceShape === "mixed"
      ? `Signals still lean development despite mixed cues${mentions ? `: ${mentions}.` : "."}`
      : `Signals point to a development or implementation delivery need${mentions ? `: ${mentions}.` : "."}`;
  }

  return MIXED_SIGNALS_SUMMARY;
}

function extractMentions(corpus: string, lane: ConversationLane): string {
  const sourceTerms = lane === "organization"
    ? ORGANIZATION_SIGNALS
    : lane === "individual"
      ? INDIVIDUAL_SIGNALS
      : DEVELOPMENT_SIGNALS;
  const matched = sourceTerms.filter((term) => corpus.includes(term)).slice(0, 3);
  return matched.join(", ");
}