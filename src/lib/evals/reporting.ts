import { createEvalScorecard, normalizeEvalObservation, type EvalObservation, type EvalRunConfig, type EvalRunReport, type EvalScoreDimension } from "./domain";

interface BuildEvalRunReportOptions {
  scenarioId: string;
  cohortId: string;
  run: EvalRunConfig;
  observations: EvalObservation[];
  dimensions: EvalScoreDimension[];
}

export function summarizeEvalRun(report: EvalRunReport): string {
  return `${report.scenarioId} ${report.passed ? "passed" : "failed"} in ${report.run.mode} mode on ${report.run.targetEnvironment} with ${report.scorecard.totalScore}/${report.scorecard.maxScore} points.`;
}

export function buildEvalRunReport(options: BuildEvalRunReportOptions): EvalRunReport {
  const scorecard = createEvalScorecard(options.dimensions);
  const observations = options.observations.map(normalizeEvalObservation);
  const failureReasons = scorecard.dimensions
    .filter((dimension) => !dimension.passed)
    .map((dimension) => dimension.details ?? `${dimension.label} scored ${dimension.score}/${dimension.maxScore}.`);

  const report: EvalRunReport = {
    scenarioId: options.scenarioId,
    cohortId: options.cohortId,
    run: options.run,
    observations,
    scorecard,
    summary: "",
    passed: scorecard.passed,
    failureReasons,
  };

  return {
    ...report,
    summary: summarizeEvalRun(report),
  };
}

export function serializeEvalRunReport(report: EvalRunReport): string {
  return JSON.stringify(
    {
      version: 1,
      scenarioId: report.scenarioId,
      cohortId: report.cohortId,
      passed: report.passed,
      summary: report.summary,
      run: report.run,
      scorecard: report.scorecard,
      failureReasons: report.failureReasons,
      observations: report.observations,
    },
    null,
    2,
  );
}