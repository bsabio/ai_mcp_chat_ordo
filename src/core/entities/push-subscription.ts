export interface BrowserPushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushSubscriptionRecord {
  endpoint: string;
  userId: string;
  expirationTime: number | null;
  p256dhKey: string;
  authKey: string;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  lastNotifiedAt: string | null;
}

export interface PushSubscriptionSeed {
  userId: string;
  subscription: BrowserPushSubscription;
  userAgent?: string | null;
}