import {
  getAdminJournalDetailPath,
  getAdminJournalListPath,
} from "@/lib/journal/admin-journal-routes";

export function getAdminDashboardPath(): string {
  return "/admin";
}

export function getAdminSystemPath(): string {
  return "/admin/system";
}

export function getAdminUsersPath(): string {
  return "/admin/users";
}

export function getAdminUserDetailPath(userId: string): string {
  return `/admin/users/${encodeURIComponent(userId)}`;
}

export function getAdminLeadsPath(): string {
  return "/admin/leads";
}

export function getAdminAffiliatesPath(): string {
  return "/admin/affiliates";
}

export function getAdminJournalPath(): string {
  return getAdminJournalListPath();
}

export { getAdminJournalDetailPath };