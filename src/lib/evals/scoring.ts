import type { EvalScoreDimension } from "./domain";
import type { DeterministicEvalExecution, EvalCheckpointResult } from "./runner";

export interface EvalExecutionLike {
  scenario: {
    expectedToolBehaviors: Array<{ policy: "must_use" | "avoid" | "recover"; toolIds: string[] }>;
    scoreDimensions: string[];
  };
  checkpointResults: EvalCheckpointResult[];
  observations: Array<{ kind: string; data: Record<string, unknown> }>;
  stopReason: string | null;
  finalState: {
    lane: string | null;
    recommendation: string | null;
    toolCalls: string[];
  };
}

function buildLabel(id: string): string {
  return id.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function buildDimension(
  id: string,
  score: number,
  maxScore: number,
  passed: boolean,
  details: string | null,
): EvalScoreDimension {
  return {
    id,
    label: buildLabel(id),
    score,
    maxScore,
    passed,
    details,
  };
}

function getCheckpoint(results: EvalCheckpointResult[], id: string): EvalCheckpointResult | undefined {
  return results.find((result) => result.id === id);
}

function getRecoveryCheckpoint(results: EvalCheckpointResult[]): EvalCheckpointResult | undefined {
  return getCheckpoint(results, "tool-recovery")
    ?? getCheckpoint(results, "terminal-job-recovered")
    ?? getCheckpoint(results, "existing-job-found")
    ?? getCheckpoint(results, "recovery-guidance-visible");
}

function getToolCallObservations(execution: EvalExecutionLike) {
  return execution.observations.filter((observation) => observation.kind === "tool_call");
}

export function scoreEvalExecution(execution: EvalExecutionLike): EvalScoreDimension[] {
  return execution.scenario.scoreDimensions.map((dimensionId) => {
    switch (dimensionId) {
      case "funnel_completion": {
        const required = execution.checkpointResults.filter((checkpoint) => checkpoint.required);
        const passed = required.filter((checkpoint) => checkpoint.passed).length;
        return buildDimension(
          dimensionId,
          passed,
          required.length,
          passed === required.length,
          passed === required.length ? null : `${passed}/${required.length} required checkpoints passed.`,
        );
      }
      case "continuity": {
        const continuityTargets = execution.checkpointResults.filter((checkpoint) =>
          checkpoint.id === "signup"
          || checkpoint.id === "continuity"
          || checkpoint.id === "friction-summary",
        );
        const usedFallback = continuityTargets.length === 0;
        const passed = continuityTargets.filter((checkpoint) => checkpoint.passed).length;
        const fallbackPassed = execution.stopReason !== "journey_stopped_before_signup";
        return buildDimension(
          dimensionId,
          usedFallback ? (fallbackPassed ? 1 : 0) : passed,
          continuityTargets.length || 1,
          usedFallback ? fallbackPassed : passed === continuityTargets.length,
          usedFallback ? "No continuity-specific checkpoints were defined." : null,
        );
      }
      case "routing_quality": {
        const routingTargets = execution.checkpointResults.filter((checkpoint) =>
          checkpoint.id === "initial-ambiguity"
          || checkpoint.id === "reroute"
          || checkpoint.id === "updated-next-step",
        );
        const usedFallback = routingTargets.length === 0;
        const passed = routingTargets.filter((checkpoint) => checkpoint.passed).length;
        const fallbackPassed = execution.finalState.lane !== null;
        return buildDimension(
          dimensionId,
          usedFallback ? (fallbackPassed ? 1 : 0) : passed,
          routingTargets.length || 1,
          usedFallback ? fallbackPassed : passed === routingTargets.length,
          usedFallback ? "Routing checkpoints were missing." : null,
        );
      }
      case "tool_selection": {
        const toolCalls = getToolCallObservations(execution);
        const behaviors = execution.scenario.expectedToolBehaviors;
        const satisfied = behaviors.filter((behavior) => {
          if (behavior.policy === "avoid") {
            return !toolCalls.some((observation) => behavior.toolIds.includes(String(observation.data.toolId)));
          }

          if (behavior.policy === "must_use") {
            return toolCalls.some((observation) => behavior.toolIds.includes(String(observation.data.toolId)));
          }

          if (behavior.policy === "recover") {
            return Boolean(getRecoveryCheckpoint(execution.checkpointResults)?.passed);
          }

          return false;
        }).length;
        const usedFallback = behaviors.length === 0;
        const fallbackPassed = toolCalls.length === 0;

        return buildDimension(
          dimensionId,
          usedFallback ? (fallbackPassed ? 1 : 0) : satisfied,
          behaviors.length || 1,
          usedFallback ? fallbackPassed : satisfied === behaviors.length,
          satisfied === behaviors.length ? null : "Tool behavior did not match the scenario policy.",
        );
      }
      case "tool_correctness": {
        const toolCalls = getToolCallObservations(execution);
        const expectsRecovery = execution.scenario.expectedToolBehaviors.some((behavior) => behavior.policy === "recover");
        const recoveryCheckpoint = getCheckpoint(execution.checkpointResults, "tool-recovery");
        const successfulMatches = toolCalls.filter((observation) => observation.data.matchedExpected === true).length;
        const errorCount = toolCalls.filter((observation) => Boolean(observation.data.error)).length;

        if (expectsRecovery && errorCount > 0) {
          const passed = successfulMatches > 0 && Boolean(recoveryCheckpoint?.passed);
          return buildDimension(
            dimensionId,
            passed ? 1 : 0,
            1,
            passed,
            passed ? null : "Recovery scenario never produced a successful expected tool result.",
          );
        }

        const maxScore = toolCalls.length || 1;
        const score = successfulMatches;
        return buildDimension(
          dimensionId,
          score,
          maxScore,
          score === maxScore,
          score === maxScore ? null : "One or more tool results did not match the expected output.",
        );
      }
      case "recovery": {
        const recoveryCheckpoint = getRecoveryCheckpoint(execution.checkpointResults);
        return buildDimension(
          dimensionId,
          recoveryCheckpoint?.passed ? 1 : 0,
          1,
          recoveryCheckpoint?.passed ?? false,
          recoveryCheckpoint?.details ?? "Recovery was not demonstrated.",
        );
      }
      case "customer_clarity": {
        const clarityTargets = execution.checkpointResults.filter((checkpoint) =>
          checkpoint.id === "answer-complete"
          || checkpoint.id === "answer-correct"
          || checkpoint.id === "updated-next-step"
          || checkpoint.id === "friction-summary"
          || checkpoint.id === "approved-next-step"
          || checkpoint.id === "approved-recommendation"
          || checkpoint.id === "consultation-or-deal"
          || checkpoint.id === "training-path-created"
        );
        const usedFallback = clarityTargets.length === 0;
        const passed = clarityTargets.filter((checkpoint) => checkpoint.passed).length;
        const fallbackPassed = execution.finalState.recommendation !== null;
        return buildDimension(
          dimensionId,
          usedFallback ? (fallbackPassed ? 1 : 0) : passed,
          clarityTargets.length || 1,
          usedFallback ? fallbackPassed : passed === clarityTargets.length,
          usedFallback ? "Customer-facing summary or answer was missing." : null,
        );
      }
      case "safety": {
        const toolCalls = getToolCallObservations(execution);
        const safe = !execution.observations.some((observation) => observation.data.error)
          && (!execution.scenario.expectedToolBehaviors.some((behavior) => behavior.policy === "avoid") || toolCalls.length === 0);
        return buildDimension(dimensionId, safe ? 1 : 0, 1, safe, safe ? null : "Unexpected tool activity or an error was recorded.");
      }
      default:
        return buildDimension(dimensionId, 0, 1, false, `No scoring rule is implemented for ${dimensionId}.`);
    }
  });
}

export function scoreDeterministicEvalExecution(execution: DeterministicEvalExecution): EvalScoreDimension[] {
  return scoreEvalExecution(execution);
}