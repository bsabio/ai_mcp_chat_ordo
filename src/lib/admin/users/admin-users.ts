import { notFound } from "next/navigation";

import type { RoleName } from "@/core/entities/user";
import type { UserAdminRecord, UserAdminDetailRecord, UserAdminFilters } from "@/adapters/UserDataMapper";
import { getUserDataMapper } from "@/adapters/RepositoryFactory";
import { getAdminUsersDetailPath } from "@/lib/admin/users/admin-users-routes";

// ── Filters ────────────────────────────────────────────────────────────

const VALID_ROLES: readonly RoleName[] = ["ANONYMOUS", "AUTHENTICATED", "APPRENTICE", "STAFF", "ADMIN"];

function readSingleValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : "";
  return typeof value === "string" ? value : "";
}

export interface AdminUserListFilters {
  search: string;
  role: RoleName | "all";
}

export function parseAdminUserFilters(
  rawSearchParams: Record<string, string | string[] | undefined>,
): AdminUserListFilters {
  const search = readSingleValue(rawSearchParams.q).trim();
  const rawRole = readSingleValue(rawSearchParams.role).trim().toUpperCase();

  let role: RoleName | "all" = "all";
  if (rawRole.length > 0 && rawRole !== "ALL") {
    if ((VALID_ROLES as readonly string[]).includes(rawRole)) {
      role = rawRole as RoleName;
    }
  }

  return { search, role };
}

// ── List view model ────────────────────────────────────────────────────

export interface AdminUserListEntry {
  id: string;
  name: string;
  email: string;
  roleLabel: string;
  createdLabel: string;
  referralCode: string | null;
  detailHref: string;
}

export interface AdminUserListViewModel {
  filters: AdminUserListFilters;
  counts: Record<string, number>;
  total: number;
  users: AdminUserListEntry[];
}

function getRoleLabel(roles: RoleName[]): string {
  if (roles.includes("ADMIN")) return "Admin";
  if (roles.includes("STAFF")) return "Staff";
  if (roles.includes("APPRENTICE")) return "Apprentice";
  if (roles.includes("AUTHENTICATED")) return "User";
  return "Anonymous";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function toListEntry(record: UserAdminRecord): AdminUserListEntry {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    roleLabel: getRoleLabel(record.roles),
    createdLabel: formatDate(record.createdAt),
    referralCode: record.referralCode,
    detailHref: getAdminUsersDetailPath(record.id),
  };
}

export async function loadAdminUserList(
  rawSearchParams: Record<string, string | string[] | undefined>,
): Promise<AdminUserListViewModel> {
  const filters = parseAdminUserFilters(rawSearchParams);
  const mapper = getUserDataMapper();

  const queryFilters: UserAdminFilters = {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.role !== "all" ? { role: filters.role } : {}),
  };
  const baseFilters: Omit<UserAdminFilters, "role"> = {
    ...(filters.search ? { search: filters.search } : {}),
  };

  const [total, counts, users] = await Promise.all([
    mapper.countForAdmin(queryFilters),
    mapper.countByRole(baseFilters),
    mapper.listForAdmin(queryFilters),
  ]);

  return {
    filters,
    counts,
    total,
    users: users.map(toListEntry),
  };
}

// ── Detail view model ──────────────────────────────────────────────────

export interface AdminUserDetailViewModel {
  user: {
    id: string;
    name: string;
    email: string;
    roles: RoleName[];
    roleLabel: string;
    createdLabel: string;
    credential: string | null;
    affiliateEnabled: boolean;
    referralCode: string | null;
  };
  preferences: Array<{ key: string; value: string }>;
  referrals: Array<{
    id: string;
    referralCode: string;
    scannedAt: string | null;
    convertedAt: string | null;
    outcome: string | null;
  }>;
  conversationCount: number;
  recentConversations: Array<{
    id: string;
    title: string;
    lane: string;
    updatedAt: string;
  }>;
}

export async function loadAdminUserDetail(
  userId: string,
): Promise<AdminUserDetailViewModel> {
  const mapper = getUserDataMapper();
  const record: UserAdminDetailRecord | null = await mapper.findByIdForAdmin(userId);

  if (!record) {
    notFound();
  }

  return {
    user: {
      id: record.id,
      name: record.name,
      email: record.email,
      roles: record.roles,
      roleLabel: getRoleLabel(record.roles),
      createdLabel: formatDate(record.createdAt),
      credential: record.credential,
      affiliateEnabled: record.affiliateEnabled,
      referralCode: record.referralCode,
    },
    preferences: record.preferences,
    referrals: record.referrals,
    conversationCount: record.conversationCount,
    recentConversations: record.recentConversations,
  };
}
