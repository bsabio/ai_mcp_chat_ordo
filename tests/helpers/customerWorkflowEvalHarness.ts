export interface CustomerWorkflowEvalCheck {
  id: string;
  label: string;
  passed: boolean;
}

export interface CustomerWorkflowEvalReport {
  scenario: string;
  passed: boolean;
  checks: CustomerWorkflowEvalCheck[];
}

export function evaluateCustomerWorkflowScenario(options: {
  scenario: string;
  checks: CustomerWorkflowEvalCheck[];
}): CustomerWorkflowEvalReport {
  return {
    scenario: options.scenario,
    passed: options.checks.every((check) => check.passed),
    checks: options.checks,
  };
}