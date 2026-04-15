import type { InlineNode, ActionLinkType } from "@/core/entities/rich-content";

type ActionNode = Extract<InlineNode, { type: "action-link" }>;

export interface CapabilityActionRailProps {
  actions?: InlineNode[] | null;
  onActionClick?: (
    actionType: ActionLinkType,
    value: string,
    params?: Record<string, string>,
  ) => void;
}

function isActionNode(node: InlineNode): node is ActionNode {
  return node.type === "action-link";
}

export function CapabilityActionRail({
  actions,
  onActionClick,
}: CapabilityActionRailProps) {
  const actionNodes = actions?.filter(isActionNode) ?? [];

  if (actionNodes.length === 0) {
    return null;
  }

  return (
    <div className="ui-capability-action-rail" data-capability-action-rail="true">
      {actionNodes.map((action, index) => (
        <button
          key={`${action.label}-${index}`}
          type="button"
          onClick={() => onActionClick?.(action.actionType, action.value, action.params)}
          className="ui-capability-action focus-ring"
          data-chat-action-link={action.actionType}
          aria-label={`${action.label} (${action.actionType})`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
