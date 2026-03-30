export interface NotificationPreferences {
  pushEnabled: boolean;
  chatEnabled: boolean;
  quietHoursStart?: string; // HH:MM
  quietHoursEnd?: string;
  cooldownMinutes: number; // Min gap between same-signal alerts
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  chatEnabled: true,
  cooldownMinutes: 30,
};

const lastFired = new Map<string, number>();

export function isInQuietHours(
  prefs: NotificationPreferences,
  now: Date = new Date(),
): boolean {
  if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false;

  const [startH, startM] = prefs.quietHoursStart.split(":").map(Number);
  const [endH, endM] = prefs.quietHoursEnd.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Handles overnight ranges (e.g. 22:00–07:00)
  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

export function isCooldownActive(
  signalId: string,
  cooldownMinutes: number,
  now: number = Date.now(),
): boolean {
  const last = lastFired.get(signalId);
  if (last === undefined) return false;
  return now - last < cooldownMinutes * 60_000;
}

export function recordSignalFired(
  signalId: string,
  now: number = Date.now(),
): void {
  lastFired.set(signalId, now);
}

export function resetCooldowns(): void {
  lastFired.clear();
}
