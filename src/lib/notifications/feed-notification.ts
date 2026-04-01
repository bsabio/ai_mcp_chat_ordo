export interface FeedNotification {
  id: string;
  title: string;
  body: string;
  href?: string;
  scope: "admin" | "user";
  unread?: boolean;
  createdAt?: string;
}