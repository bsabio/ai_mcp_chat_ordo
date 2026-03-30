/**
 * Shared workflow transition infrastructure (Strategy pattern).
 * Parameterizes the transition map + human labels so every admin entity
 * can declare its own workflow and reuse the same resolver.
 */

export interface WorkflowConfig<TStatus extends string> {
  transitions: Record<TStatus, readonly TStatus[]>;
  labels: Record<string, { label: string; description: string }>;
}

export interface WorkflowActionDescriptor {
  nextStatus: string;
  label: string;
  description: string;
}

export function getWorkflowActions<TStatus extends string>(
  currentStatus: TStatus,
  config: WorkflowConfig<TStatus>,
): WorkflowActionDescriptor[] {
  const allowed = config.transitions[currentStatus];
  if (!allowed) return [];

  return allowed.map((nextStatus) => {
    const key = `${currentStatus}→${nextStatus}`;
    const meta = config.labels[key];
    return {
      nextStatus,
      label: meta?.label ?? nextStatus,
      description: meta?.description ?? `Transition from ${currentStatus} to ${nextStatus}.`,
    };
  });
}
