export type OperatorSignalId =
	| "conversation_workspace"
	| "recent_conversations"
	| "customer_workflow_continuity"
	| "lead_queue"
	| "routing_review"
	| "anonymous_opportunities"
	| "consultation_requests"
	| "deal_queue"
	| "training_path_queue"
	| "recurring_pain_themes"
	| "funnel_recommendations"
	| "system_health"
	| "overdue_follow_ups";

export interface OperatorSignalPayload<TData> {
	blockId: OperatorSignalId;
	state: "ready" | "empty";
	data: TData;
}