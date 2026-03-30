export interface AdminNotification {
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  actionUrl?: string;
  signalId?: string;
}

export interface NotificationChannel {
  send(notification: AdminNotification): Promise<void>;
}
