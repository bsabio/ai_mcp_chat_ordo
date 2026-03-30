import { getShellRouteById } from "@/lib/shell/shell-navigation";

export type AdminNavigationStatus = "live" | "preview";

export interface AdminNavigationItem {
  id: string;
  routeId: string;
  href: string;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  status: AdminNavigationStatus;
}

const ADMIN_NAV_CONFIG = [
  { routeId: "admin-dashboard", label: "Dashboard", shortLabel: "Home", icon: "D", status: "live" },
  { routeId: "admin-users", label: "Users", shortLabel: "Users", icon: "U", status: "live" },
  { routeId: "admin-leads", label: "Leads", shortLabel: "Leads", icon: "L", status: "live" },
  { routeId: "journal-admin", label: "Journal", shortLabel: "Journal", icon: "J", status: "live" },
  { routeId: "admin-prompts", label: "Prompts", shortLabel: "Prompts", icon: "P", status: "live" },
  { routeId: "admin-conversations", label: "Conversations", shortLabel: "Convos", icon: "C", status: "live" },
  { routeId: "admin-jobs", label: "Jobs", shortLabel: "Jobs", icon: "B", status: "live" },
  { routeId: "admin-system", label: "System", shortLabel: "System", icon: "S", status: "live" },
] as const;

export const ADMIN_ROUTE_IDS = ADMIN_NAV_CONFIG.map((item) => item.routeId);

export function resolveAdminNavigationItems(): AdminNavigationItem[] {
  return ADMIN_NAV_CONFIG.map((item) => {
    const route = getShellRouteById(item.routeId);

    return {
      id: route.id,
      routeId: route.id,
      href: route.href,
      label: item.label,
      shortLabel: item.shortLabel,
      icon: item.icon,
      description: route.description ?? `${route.label} admin route.`,
      status: item.status,
    };
  });
}
