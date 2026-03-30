export const PUSH_NOTIFICATIONS_PREFERENCE_KEY = "push_notifications";
export const PUSH_NOTIFICATIONS_ENABLED_VALUE = "enabled";
export const PUSH_NOTIFICATIONS_DISABLED_VALUE = "disabled";

export function isPushNotificationsEnabledValue(
  value: string | null | undefined,
): boolean {
  return value !== PUSH_NOTIFICATIONS_DISABLED_VALUE;
}