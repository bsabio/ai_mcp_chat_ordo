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
  {
    id: "member-job-status-summary-deterministic",
    name: "Member job status summary deterministic",
    cohortId: "signed-in-buyer",
    layer: "deterministic",
    targetEnvironment: "ci",
    requiredFixtures: ["signed-in member conversation", "running deferred job", "member-safe job status tool surface"],
    expectedCheckpoints: [
      { id: "active-job-visible", label: "the signed-in member can see their active job through the member-safe read surface", required: true },
      { id: "prose-summary-default", label: "the default answer summarizes the active job in plain language instead of a list", required: true },
      { id: "status-read-no-rerun", label: "status inspection does not create a duplicate job", required: true },
    ],
    expectedToolBehaviors: [
      {
        policy: "must_use",
        toolIds: ["list_my_jobs"],
        rationale: "A signed-in member asking what jobs are happening should use the user-scoped job summary surface.",
      },
    ],
    scoreDimensions: ["continuity", "tool_correctness", "customer_clarity", "safety"],
  },
  {
    id: "member-explicit-job-status-deterministic",
    name: "Member explicit job status deterministic",
    cohortId: "signed-in-buyer",
    layer: "deterministic",
    targetEnvironment: "ci",
    requiredFixtures: ["signed-in member conversation", "known deferred job id", "member-safe single-job status tool"],
    expectedCheckpoints: [
      { id: "explicit-status-explained", label: "the explicit job-id answer explains the current state in plain language", required: true },
      { id: "status-read-no-rerun", label: "the explicit job-id status read does not create a duplicate job", required: true },
    ],
    expectedToolBehaviors: [
      {
        policy: "must_use",
        toolIds: ["get_my_job_status"],
        rationale: "A signed-in member asking what a specific job is doing should use the user-scoped single-job status surface.",
      },
    ],
    scoreDimensions: ["continuity", "tool_correctness", "customer_clarity", "safety"],
  },
  {
    id: "member-all-jobs-list-deterministic",
    name: "Member all jobs list deterministic",
    cohortId: "signed-in-buyer",
    layer: "deterministic",
    targetEnvironment: "ci",
    requiredFixtures: ["signed-in member conversation", "active and terminal jobs", "member-safe list contract"],
    expectedCheckpoints: [
      { id: "explicit-list-rendered", label: "an explicit all-jobs request returns a concise list instead of prose-only narration", required: true },
      { id: "terminal-jobs-included", label: "the explicit list includes recent terminal jobs", required: true },
    ],
    expectedToolBehaviors: [
      {
        policy: "must_use",
        toolIds: ["list_my_jobs"],
        rationale: "An explicit all-jobs request should use the signed-in member list surface with terminal jobs included.",
      },
    ],
    scoreDimensions: ["continuity", "tool_correctness", "customer_clarity", "safety"],
  },
  {
    id: "anonymous-job-status-guidance-deterministic",
    name: "Anonymous job status guidance deterministic",
    cohortId: "anonymous-learner",
    layer: "deterministic",
    targetEnvironment: "ci",
    requiredFixtures: ["anonymous chat thread", "job status question"],
    expectedCheckpoints: [
      { id: "chat-native-guidance", label: "anonymous status guidance stays chat-native and sign-in-aware", required: true },
      { id: "no-jobs-route-push", label: "the anonymous reply does not push the user to /jobs", required: true },
    ],
    expectedToolBehaviors: [
      {
        policy: "avoid",
        toolIds: ["list_my_jobs", "get_my_job_status"],
        rationale: "Anonymous users should not be routed through signed-in job surfaces for status questions.",
      },
    ],
    scoreDimensions: ["customer_clarity", "safety"],
  },
  {
    id: "blog-job-status-continuity-deterministic",
    name: "Blog job status continuity deterministic",
    cohortId: "signed-in-buyer",
    layer: "deterministic",
    targetEnvironment: "ci",
    requiredFixtures: ["admin conversation", "queued deferred blog job", "status read surface"],
    expectedCheckpoints: [
      { id: "active-job-visible", label: "the active deferred blog job is visible through the read surface", required: true },
      { id: "status-read-no-rerun", label: "status inspection does not create a duplicate production job", required: true },
      { id: "progress-preserved", label: "the current progress label survives the status read", required: true },
    ],
    expectedToolBehaviors: [
      {
        policy: "must_use",
        toolIds: ["list_deferred_jobs", "get_deferred_job_status"],
        rationale: "Deferred blog status should be handled through explicit read tools rather than a fresh production run.",
      },
    ],
    scoreDimensions: ["continuity", "tool_correctness", "customer_clarity", "safety"],
  },
  {
    id: "blog-explicit-status-check-deterministic",
    name: "Blog explicit status check deterministic",
    cohortId: "signed-in-buyer",
    layer: "deterministic",
    targetEnvironment: "ci",
    requiredFixtures: ["admin conversation", "queued deferred blog job", "explicit job-id status follow-up"],
    expectedCheckpoints: [
      { id: "conversation-shape-preserved", label: "the produce request, queue follow-up, and explicit job-id follow-up are all preserved", required: true },
      { id: "explicit-status-explained", label: "the explicit job-id status reply explains the current state in plain language", required: true },
      { id: "status-read-no-rerun", label: "the explicit status check does not create a duplicate production job", required: true },
    ],
    expectedToolBehaviors: [
      {
        policy: "must_use",
        toolIds: ["list_deferred_jobs", "get_deferred_job_status"],
        rationale: "An explicit follow-up asking for a job id status should inspect the existing deferred job instead of starting a new production run.",
      },
    ],
    scoreDimensions: ["continuity", "tool_correctness", "customer_clarity", "safety"],
  },
  {
    id: "blog-job-dedupe-clarity-deterministic",
    name: "Blog job dedupe clarity deterministic",
    cohortId: "signed-in-buyer",
    layer: "deterministic",
    targetEnvironment: "ci",
    requiredFixtures: ["running deferred blog job", "deduped deferred response envelope"],
    expectedCheckpoints: [
      { id: "dedupe-detected", label: "the runtime detects the existing active blog job", required: true },
      { id: "reuse-copy-clear", label: "the deduped status copy clearly states that the existing job is reused", required: true },
      { id: "single-job-preserved", label: "dedupe does not create a second active production job", required: true },
    ],
    expectedToolBehaviors: [
      {
        policy: "must_use",
        toolIds: ["list_deferred_jobs", "get_deferred_job_status"],
        rationale: "Deduped blog workflows should still route through explicit job inspection semantics.",
      },
    ],
    scoreDimensions: ["continuity", "customer_clarity", "safety"],
  },
  {
    id: "blog-produce-publish-handoff-deterministic",
    name: "Blog produce to publish handoff deterministic",
    cohortId: "signed-in-buyer",
    layer: "deterministic",
    targetEnvironment: "ci",
    requiredFixtures: ["completed produce_blog_article job", "draft blog post", "chat presenter actions"],
    expectedCheckpoints: [
      { id: "post-id-preserved", label: "the completed production result preserves the draft post id", required: true },
      { id: "publish-action-visible", label: "the chat surface exposes a publish-ready action for the produced draft", required: true },
      { id: "publish-command-correct", label: "the publish action targets the preserved draft post id", required: true },
    ],
    expectedToolBehaviors: [
      {
        policy: "must_use",
        toolIds: ["publish_content"],
        rationale: "Sprint 6 must hand operators from completed production directly into the publish tool when appropriate.",
      },
    ],
    scoreDimensions: ["continuity", "tool_correctness", "customer_clarity", "safety"],
  },
  {
    id: "blog-missed-sse-recovery-deterministic",
    name: "Blog missed SSE recovery deterministic",
    cohortId: "signed-in-buyer",
    layer: "deterministic",
    targetEnvironment: "ci",
    requiredFixtures: ["completed deferred blog job", "terminal job snapshot", "reconciliation path"],
    expectedCheckpoints: [
      { id: "terminal-job-recovered", label: "a completed deferred blog job is recovered from the snapshot surface", required: true },
      { id: "summary-preserved", label: "the terminal job summary survives recovery", required: true },
      { id: "post-id-available", label: "the recovered terminal result still exposes the produced draft id", required: true },
    ],
    expectedToolBehaviors: [
      {
        policy: "must_use",
        toolIds: ["list_deferred_jobs", "get_deferred_job_status"],
        rationale: "Recovery after missed SSE depends on snapshot reads rather than replaying a new job.",
      },
    ],
    scoreDimensions: ["continuity", "recovery", "customer_clarity", "safety"],
  },
  {
    id: "live-blog-job-status-and-publish-handoff",
    name: "Live blog job status and publish handoff",
    cohortId: "signed-in-buyer",
    layer: "live_model",
    targetEnvironment: "local",
    requiredFixtures: ["admin blog conversation", "completed production job", "publishable draft post"],
    expectedCheckpoints: [
      { id: "job-inspected", label: "the model inspects the existing deferred blog job", required: true },
      { id: "publish-triggered", label: "the model triggers publish for the produced draft when it is ready", required: true },
      { id: "publish-complete", label: "the draft becomes published and the answer reflects that completion", required: true },
    ],
    expectedToolBehaviors: [
      {
        policy: "must_use",
        toolIds: ["list_deferred_jobs", "get_deferred_job_status", "publish_content"],
        rationale: "The live model should inspect job state and publish the ready draft instead of re-running production.",
      },
    ],
    scoreDimensions: ["continuity", "tool_correctness", "customer_clarity", "safety"],
  },
  {
    id: "live-blog-job-reuse-instead-of-rerun",
    name: "Live blog job reuse instead of rerun",
    cohortId: "signed-in-buyer",
    layer: "live_model",
    targetEnvironment: "local",
    requiredFixtures: ["admin blog conversation", "running production job", "status tool surface"],
    expectedCheckpoints: [
      { id: "existing-job-found", label: "the model identifies the already-running blog job", required: true },
      { id: "rerun-avoided", label: "the model avoids triggering another production run", required: true },
      { id: "active-status-explained", label: "the response explains that the existing job is still queued or running", required: true },
    ],
    expectedToolBehaviors: [
      {
        policy: "must_use",
        toolIds: ["list_deferred_jobs", "get_deferred_job_status"],
        rationale: "The live model should check existing deferred work rather than calling produce_blog_article again.",
      },
    ],
    scoreDimensions: ["continuity", "tool_correctness", "customer_clarity", "safety"],
  },
  {
    id: "live-blog-completion-recovery",
    name: "Live blog completion recovery",
    cohortId: "signed-in-buyer",
    layer: "live_model",
    targetEnvironment: "local",
    requiredFixtures: ["admin blog conversation", "completed production job", "snapshot recovery path"],
    expectedCheckpoints: [
      { id: "terminal-job-recovered", label: "the model recovers the completed job through the status surface", required: true },
      { id: "publish-readiness-explained", label: "the model explains that the produced draft is ready to publish", required: true },
      { id: "completion-visible-without-rerun", label: "the response uses the recovered completion instead of a new production run", required: true },
    ],
    expectedToolBehaviors: [
      {
        policy: "must_use",
        toolIds: ["list_deferred_jobs", "get_deferred_job_status"],
        rationale: "Completion recovery should come from snapshot reads after missed live updates.",
      },
    ],
    scoreDimensions: ["continuity", "recovery", "customer_clarity", "safety"],
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
    "member-job-status-summary-deterministic",
    "member-explicit-job-status-deterministic",
    "member-all-jobs-list-deterministic",
    "anonymous-job-status-guidance-deterministic",
    "blog-job-status-continuity-deterministic",
    "blog-explicit-status-check-deterministic",
    "blog-job-dedupe-clarity-deterministic",
    "blog-produce-publish-handoff-deterministic",
    "blog-missed-sse-recovery-deterministic",
    "live-blog-job-status-and-publish-handoff",
    "live-blog-job-reuse-instead-of-rerun",
    "live-blog-completion-recovery",
  ];

  for (const scenarioId of requiredScenarioIds) {
    if (!EVAL_SCENARIOS.some((scenario) => scenario.id === scenarioId)) {
      errors.push(`Missing required eval scenario: ${scenarioId}`);
    }
  }

  return errors;
}