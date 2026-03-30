import type { AdminNotification } from "@/core/entities/NotificationChannel";
import type { OperatorSignalPayload } from "@/lib/operator/operator-signal-types";
import type { NotificationDispatcher } from "./notification-dispatcher";

export interface SignalRule {
  signalId: string;
  condition: (data: OperatorSignalPayload<unknown>) => boolean;
  notification: Omit<AdminNotification, "signalId">;
}

export class AdminSignalEvaluator {
  constructor(
    private readonly rules: SignalRule[],
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  async evaluate(signals: OperatorSignalPayload<unknown>[]): Promise<void> {
    for (const signal of signals) {
      for (const rule of this.rules) {
        if (rule.signalId === signal.blockId && rule.condition(signal)) {
          await this.dispatcher.dispatch({
            ...rule.notification,
            signalId: rule.signalId,
          });
        }
      }
    }
  }
}

export const DEFAULT_SIGNAL_RULES: SignalRule[] = [
  {
    signalId: "lead_queue",
    condition: (signal) => {
      const data = signal.data as { uncontactedCount?: number };
      return (data?.uncontactedCount ?? 0) > 5;
    },
    notification: {
      title: "Lead queue growing",
      body: "More than 5 uncontacted leads — review the lead queue.",
      severity: "warning",
      actionUrl: "/admin/leads",
    },
  },
  {
    signalId: "system_health",
    condition: (signal) => {
      const data = signal.data as { failedJobsLastHour?: number };
      return (data?.failedJobsLastHour ?? 0) > 3;
    },
    notification: {
      title: "Job failures spiking",
      body: "More than 3 failed jobs in the last hour.",
      severity: "critical",
      actionUrl: "/admin/jobs",
    },
  },
  {
    signalId: "consultation_requests",
    condition: (signal) => {
      const data = signal.data as { oldestPendingHours?: number };
      return (data?.oldestPendingHours ?? 0) > 48;
    },
    notification: {
      title: "Consultation pending too long",
      body: "A consultation request has been pending for over 48 hours.",
      severity: "warning",
      actionUrl: "/admin/leads",
    },
  },
  {
    signalId: "system_health",
    condition: (signal) => {
      const data = signal.data as { status?: string };
      return data?.status === "degraded";
    },
    notification: {
      title: "System health degraded",
      body: "One or more system health checks are failing.",
      severity: "critical",
      actionUrl: "/admin/system",
    },
  },
  {
    signalId: "overdue_follow_ups",
    condition: (signal) => {
      const data = signal.data as { overdueHours?: number };
      return (data?.overdueHours ?? 0) > 24 && (data?.overdueHours ?? 0) <= 72;
    },
    notification: {
      title: "Follow-up overdue",
      body: "A follow-up is overdue by more than 24 hours.",
      severity: "warning",
      actionUrl: "/admin/leads",
    },
  },
  {
    signalId: "overdue_follow_ups",
    condition: (signal) => {
      const data = signal.data as { overdueHours?: number };
      return (data?.overdueHours ?? 0) > 72;
    },
    notification: {
      title: "Follow-up critically overdue",
      body: "A follow-up is overdue by more than 72 hours — immediate attention required.",
      severity: "critical",
      actionUrl: "/admin/leads",
    },
  },
];
