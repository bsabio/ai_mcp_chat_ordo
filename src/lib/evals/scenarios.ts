import type { EvalCohort, EvalScenario } from "./domain";
import { validateEvalCohort, validateEvalScenario } from "./domain";

export const EVAL_COHORTS: readonly EvalCohort[] = [
  {
    id: "anonymous-org-buyer",
    name: "Anonymous organization buyer",
    entryMode: "anonymous",
    primaryLane: "organization",
    urgency: "high",
    budgetSignal: "likely",
    technicalMaturity: "mixed",
    intentDepth: "high",
    notes: ["High-intent operational pain", "Budget likely but not yet explicit"],
  },
  {
    id: "anonymous-learner",
    name: "Anonymous learner with serious training intent",
    entryMode: "anonymous",
    primaryLane: "individual",
    urgency: "medium",
    budgetSignal: "unclear",
    technicalMaturity: "mixed",
    intentDepth: "medium",
    notes: ["Needs continuity into signup", "Training goals become clearer over time"],
  },
  {
    id: "signed-in-buyer",
    name: "Signed-in organizational buyer",
    entryMode: "authenticated",
    primaryLane: "organization",
    urgency: "high",
    budgetSignal: "confirmed",
    technicalMaturity: "mixed",
    intentDepth: "high",
    notes: ["Should reach consultation or deal readiness", "Needs approved downstream next step"],
  },
  {
    id: "signed-in-learner",
    name: "Signed-in learner seeking operator path",
    entryMode: "authenticated",
    primaryLane: "individual",
    urgency: "medium",
    budgetSignal: "likely",
    technicalMaturity: "mixed",
    intentDepth: "high",
    notes: ["Strong fit for training-path follow-up", "May need apprenticeship screening"],
  },
  {
    id: "ambiguous-dev-prospect",
    name: "Ambiguous development prospect",
    entryMode: "mixed",
    primaryLane: "development",
    urgency: "high",
    budgetSignal: "likely",
    technicalMaturity: "technical",
    intentDepth: "high",
    notes: ["May start uncertain", "Needs reroute after stronger implementation signals"],
  },
  {
    id: "tool-heavy-researcher",
    name: "Tool-heavy researcher",
    entryMode: "authenticated",
    primaryLane: "mixed",
    urgency: "medium",
    budgetSignal: "none",
    technicalMaturity: "technical",
    intentDepth: "high",
    notes: ["Should trigger MCP tool usage", "Good fit for recovery and multi-tool scoring"],
  },
] as const;

export const EVAL_SCENARIOS: readonly EvalScenario[] = [
  {
    id: "anonymous-high-intent-dropout",
    name: "Anonymous high-intent dropout",
    cohortId: "anonymous-org-buyer",
    layer: "deterministic",
    targetEnvironment: "ci",
    requiredFixtures: ["anonymous conversation", "conversation events", "analytics summary"],
    expectedCheckpoints: [
      { id: "anonymous-discovery", label: "anonymous discovery is recorded", required: true },
      { id: "dropout-detected", label: "dropout is detected without signup", required: true },
      { id: "friction-summary", label: "a likely-friction explanation is retained", required: true },
    ],
    expectedToolBehaviors: [],
    scoreDimensions: ["funnel_completion", "continuity", "safety"],
  },
  {
    id: "anonymous-signup-continuity",
    name: "Anonymous signup continuity",
    cohortId: "anonymous-learner",
    layer: "deterministic",
    targetEnvironment: "ci",
    requiredFixtures: ["anonymous conversation", "user account", "continued conversation"],
    expectedCheckpoints: [
      { id: "anonymous-discovery", label: "anonymous discovery is recorded", required: true },
      { id: "signup", label: "user signs up", required: true },
      { id: "continuity", label: "conversation continuity is preserved after signup", required: true },
    ],
    expectedToolBehaviors: [],
    scoreDimensions: ["funnel_completion", "continuity"],
  },
  {
    id: "live-anonymous-high-intent-loss",
    name: "Live anonymous high-intent loss",
    cohortId: "anonymous-org-buyer",
    layer: "live_model",
    targetEnvironment: "local",
    requiredFixtures: ["anonymous conversation", "live-model prompt", "dropout rubric"],
    expectedCheckpoints: [
      { id: "anonymous-discovery", label: "anonymous discovery is recorded", required: true },
      { id: "dropout-detected", label: "dropout is detected without signup", required: true },
      { id: "friction-summary", label: "a likely-friction explanation is retained", required: true },
    ],
    expectedToolBehaviors: [],
    scoreDimensions: ["funnel_completion", "continuity", "customer_clarity"],
  },
  {
    id: "live-anonymous-signup-continuity",
    name: "Live anonymous signup continuity",
    cohortId: "anonymous-learner",
    layer: "live_model",
    targetEnvironment: "local",
    requiredFixtures: ["anonymous conversation", "user account", "post-signup prompt"],
    expectedCheckpoints: [
      { id: "anonymous-discovery", label: "anonymous discovery is recorded", required: true },
      { id: "signup", label: "user signs up", required: true },
      { id: "continuity", label: "conversation continuity is preserved after signup", required: true },
    ],
    expectedToolBehaviors: [],
    scoreDimensions: ["funnel_completion", "continuity", "customer_clarity"],
  },
  {
    id: "organization-buyer-funnel",
    name: "Organization buyer funnel",
    cohortId: "signed-in-buyer",
    layer: "live_model",
    targetEnvironment: "local",
    requiredFixtures: ["signed-in user", "consultation request", "deal records"],
    expectedCheckpoints: [
      { id: "qualification", label: "organization qualification becomes actionable", required: true },
      { id: "consultation-or-deal", label: "consultation or direct deal conversion occurs", required: true },
      { id: "approved-next-step", label: "customer sees an approved next step", required: true },
    ],
    expectedToolBehaviors: [],
    scoreDimensions: ["funnel_completion", "customer_clarity", "continuity"],
  },
  {
    id: "organization-buyer-deterministic",
    name: "Organization buyer deterministic funnel",
    cohortId: "signed-in-buyer",
    layer: "deterministic",
    targetEnvironment: "ci",
    requiredFixtures: ["signed-in user", "qualified lead", "reviewed consultation request", "deal-ready visibility"],
    expectedCheckpoints: [
      { id: "qualification", label: "organization qualification becomes actionable", required: true },
      { id: "consultation-or-deal", label: "consultation or direct deal conversion occurs", required: true },
      { id: "approved-next-step", label: "customer sees an approved next step", required: true },
    ],
    expectedToolBehaviors: [],
    scoreDimensions: ["funnel_completion", "customer_clarity"],
  },
  {
    id: "individual-learner-funnel",
    name: "Individual learner funnel",
    cohortId: "signed-in-learner",
    layer: "live_model",
    targetEnvironment: "local",
    requiredFixtures: ["signed-in user", "qualified lead", "training-path records"],
    expectedCheckpoints: [
      { id: "training-fit", label: "training fit becomes concrete", required: true },
      { id: "training-path-created", label: "training-path record is created", required: true },
      { id: "approved-recommendation", label: "customer sees an approved training recommendation", required: true },
    ],
    expectedToolBehaviors: [],
    scoreDimensions: ["funnel_completion", "customer_clarity", "continuity"],
  },
  {
    id: "individual-learner-deterministic",
    name: "Individual learner deterministic funnel",
    cohortId: "signed-in-learner",
    layer: "deterministic",
    targetEnvironment: "ci",
    requiredFixtures: ["signed-in user", "qualified lead", "training recommendation visibility"],
    expectedCheckpoints: [
      { id: "training-fit", label: "training fit becomes concrete", required: true },
      { id: "training-path-created", label: "training-path record is created", required: true },
      { id: "approved-recommendation", label: "customer sees an approved training recommendation", required: true },
    ],
    expectedToolBehaviors: [],
    scoreDimensions: ["funnel_completion", "customer_clarity", "continuity"],
  },
  {
    id: "development-prospect-funnel",
    name: "Development prospect funnel",
    cohortId: "ambiguous-dev-prospect",
    layer: "live_model",
    targetEnvironment: "local",
    requiredFixtures: ["technical context", "qualified lead", "deal records"],
    expectedCheckpoints: [
      { id: "technical-qualification", label: "technical context becomes sufficient for scoping", required: true },
      { id: "deal-created", label: "development deal is created", required: true },
      { id: "approved-next-step", label: "customer sees an approved deal stage", required: true },
    ],
    expectedToolBehaviors: [],
    scoreDimensions: ["funnel_completion", "routing_quality", "customer_clarity"],
  },
  {
    id: "misclassification-reroute",
    name: "Misclassification and reroute",
    cohortId: "ambiguous-dev-prospect",
    layer: "deterministic",
    targetEnvironment: "ci",
    requiredFixtures: ["uncertain conversation", "updated routing evidence"],
    expectedCheckpoints: [
      { id: "initial-ambiguity", label: "initial routing is ambiguous or incomplete", required: true },
      { id: "reroute", label: "conversation is rerouted after stronger evidence", required: true },
      { id: "updated-next-step", label: "the recommended next step changes with the reroute", required: true },
    ],
    expectedToolBehaviors: [],
    scoreDimensions: ["routing_quality", "funnel_completion"],
  },
  {
    id: "mcp-tool-choice-and-recovery",
    name: "MCP tool choice and recovery",
    cohortId: "tool-heavy-researcher",
    layer: "live_model",
    targetEnvironment: "local",
    requiredFixtures: ["tool-accessible corpus", "recoverable MCP failure fixture"],
    expectedCheckpoints: [
      { id: "tool-selection", label: "model chooses the correct MCP tool", required: true },
      { id: "tool-arguments", label: "tool arguments are valid", required: true },
      { id: "tool-recovery", label: "model recovers coherently from tool failure", required: true },
    ],
    expectedToolBehaviors: [
      {
        policy: "must_use",
        toolIds: ["calculator", "embedding", "web_search", "librarian"],
        rationale: "The eval catalog must support scenarios where a real MCP tool is required.",
      },
      {
        policy: "recover",
        toolIds: ["calculator", "embedding", "web_search", "librarian"],
        rationale: "The model must recover coherently when one of the target tools fails.",
      },
    ],
    scoreDimensions: ["tool_selection", "tool_correctness", "recovery", "customer_clarity"],
  },
  {
    id: "mcp-tool-avoidance",
    name: "MCP tool avoidance",
    cohortId: "tool-heavy-researcher",
    layer: "deterministic",
    targetEnvironment: "ci",
    requiredFixtures: ["answerable conversation", "tool-free expected response fixture"],
    expectedCheckpoints: [
      { id: "no-tool-needed", label: "the task is answerable without a tool", required: true },
      { id: "tool-avoided", label: "the model avoids unnecessary tool use", required: true },
      { id: "answer-complete", label: "the answer remains complete without tool usage", required: true },
    ],
    expectedToolBehaviors: [
      {
        policy: "avoid",
        toolIds: ["calculator", "embedding", "web_search", "librarian"],
        rationale: "The eval catalog must cover cases where the model should not call a tool at all.",
      },
    ],
    scoreDimensions: ["tool_selection", "customer_clarity", "safety"],
  },
  {
    id: "mcp-calculator-must-use",
    name: "MCP calculator must use",
    cohortId: "tool-heavy-researcher",
    layer: "deterministic",
    targetEnvironment: "ci",
    requiredFixtures: ["calculator-ready arithmetic prompt", "expected arithmetic result"],
    expectedCheckpoints: [
      { id: "tool-needed", label: "the task clearly requires the calculator tool", required: true },
      { id: "tool-called", label: "the calculator tool is called with valid arguments", required: true },
      { id: "answer-correct", label: "the final answer reflects the calculator result correctly", required: true },
    ],
    expectedToolBehaviors: [
      {
        policy: "must_use",
        toolIds: ["calculator"],
        rationale: "The deterministic runner needs one positive tool-call scenario before live-model evals exist.",
      },
    ],
    scoreDimensions: ["tool_selection", "tool_correctness", "customer_clarity", "safety"],
  },
  {
    id: "mcp-multi-tool-synthesis",
    name: "MCP multi-tool synthesis",
    cohortId: "tool-heavy-researcher",
    layer: "live_model",
    targetEnvironment: "local",
    requiredFixtures: ["multi-source corpus", "calculator-ready data", "combined answer rubric"],
    expectedCheckpoints: [
      { id: "multi-tool-selection", label: "the model selects more than one tool appropriately", required: true },
      { id: "result-combination", label: "tool outputs are combined into one coherent answer", required: true },
      { id: "final-answer-accuracy", label: "the final answer reflects the combined tool outputs correctly", required: true },
    ],
    expectedToolBehaviors: [
      {
        policy: "must_use",
        toolIds: ["web_search", "calculator"],
        rationale: "The eval catalog must cover multi-tool workflows where a final answer depends on combining results.",
      },
    ],
    scoreDimensions: ["tool_selection", "tool_correctness", "customer_clarity", "funnel_completion"],
  },
] as const;

export function getEvalScenarioById(id: string): EvalScenario {
  const scenario = EVAL_SCENARIOS.find((candidate) => candidate.id === id);

  if (!scenario) {
    throw new Error(`Unknown eval scenario id: ${id}`);
  }

  return scenario;
}

export function validateEvalCatalog(): string[] {
  const cohortIds = EVAL_COHORTS.map((cohort) => cohort.id);
  const errors = [
    ...EVAL_COHORTS.flatMap(validateEvalCohort),
    ...EVAL_SCENARIOS.flatMap((scenario) => validateEvalScenario(scenario, cohortIds)),
  ];

  const requiredScenarioIds = [
    "anonymous-high-intent-dropout",
    "anonymous-signup-continuity",
    "live-anonymous-high-intent-loss",
    "live-anonymous-signup-continuity",
    "organization-buyer-funnel",
    "individual-learner-funnel",
    "development-prospect-funnel",
    "misclassification-reroute",
    "mcp-tool-choice-and-recovery",
    "mcp-tool-avoidance",
    "mcp-calculator-must-use",
    "mcp-multi-tool-synthesis",
  ];

  for (const scenarioId of requiredScenarioIds) {
    if (!EVAL_SCENARIOS.some((scenario) => scenario.id === scenarioId)) {
      errors.push(`Missing required eval scenario: ${scenarioId}`);
    }
  }

  return errors;
}