import type { AdminNotification, NotificationChannel } from "@/core/entities/NotificationChannel";
import type { MessageDataMapper } from "@/adapters/MessageDataMapper";

/**
 * Sends an admin notification as a system message into the admin's most
 * recent conversation. If no conversation exists, the notification is
 * silently dropped (chat delivery is optional).
 */
export class ChatNotificationChannel implements NotificationChannel {
  constructor(
    private readonly messageMapper: MessageDataMapper,
    private readonly getAdminConversationId: () => Promise<string | null>,
  ) {}

  async send(notification: AdminNotification): Promise<void> {
    const conversationId = await this.getAdminConversationId();
    if (!conversationId) return;

    const content = `[${notification.severity.toUpperCase()}] ${notification.title}: ${notification.body}`;

    await this.messageMapper.create({
      conversationId,
      role: "system",
      content,
      parts: [
        {
          type: "text",
          text: content,
        },
      ],
    });
  }
}
