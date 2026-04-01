import { getShellRouteById } from "@/lib/shell/shell-navigation";

type SearchParamsLike = Pick<URLSearchParams, "get"> | null | undefined;

export type AdminNavigationStatus = "live" | "preview";
export type AdminNavigationGroupId = "overview" | "operations" | "content" | "governance" | "platform";

export interface AdminNavigationItem {
  id: string;
  routeId: string;
  href: string;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  status: AdminNavigationStatus;
  groupId: AdminNavigationGroupId;
  groupLabel: string;
}

export interface AdminNavigationGroup {
  id: AdminNavigationGroupId;
  label: string;
  description?: string;
  items: AdminNavigationItem[];
}

export interface AdminWorkspaceContextItem {
  id: string;
  href: string;
  label: string;
  description: string;
}

export interface AdminWorkspaceContextSection {
  id: string;
  label: string;
  description: string;
  currentItemId: string;
  items: AdminWorkspaceContextItem[];
}

const ADMIN_NAV_GROUP_CONFIG = [
  {
    id: "overview",
    label: "Overview",
    description: "Cross-workspace wayfinding and health.",
    items: [
      { routeId: "admin-dashboard", label: "Dashboard", shortLabel: "Home", icon: "D", status: "live" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    description: "Pipeline, review, and queue work.",
    items: [
      { routeId: "admin-leads", label: "Leads", shortLabel: "Leads", icon: "L", status: "live" },
      { routeId: "admin-affiliates", label: "Affiliates", shortLabel: "Affiliates", icon: "A", status: "live" },
      { routeId: "admin-conversations", label: "Conversations", shortLabel: "Convos", icon: "C", status: "live" },
      { routeId: "admin-jobs", label: "Jobs", shortLabel: "Jobs", icon: "B", status: "live" },
    ],
  },
  {
    id: "content",
    label: "Content",
    description: "Editorial workflow and publishing.",
    items: [
      { routeId: "journal-admin", label: "Journal", shortLabel: "Journal", icon: "J", status: "live" },
    ],
  },
  {
    id: "governance",
    label: "Governance",
    description: "Identity and prompt administration.",
    items: [
      { routeId: "admin-users", label: "Users", shortLabel: "Users", icon: "U", status: "live" },
      { routeId: "admin-prompts", label: "Prompts", shortLabel: "Prompts", icon: "P", status: "live" },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    description: "Runtime and system controls.",
    items: [
      { routeId: "admin-system", label: "System", shortLabel: "System", icon: "S", status: "live" },
    ],
  },
] as const;

function buildAdminNavigationItem(
  groupId: AdminNavigationGroupId,
  groupLabel: string,
  item: (typeof ADMIN_NAV_GROUP_CONFIG)[number]["items"][number],
): AdminNavigationItem {
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
    groupId,
    groupLabel,
  };
}

export function resolveAdminNavigationGroups(): AdminNavigationGroup[] {
  return ADMIN_NAV_GROUP_CONFIG.map((group) => ({
    id: group.id,
    label: group.label,
    description: group.description,
    items: group.items.map((item) => buildAdminNavigationItem(group.id, group.label, item)),
  }));
}

export function resolveAdminNavigationItems(): AdminNavigationItem[] {
  return resolveAdminNavigationGroups().flatMap((group) => group.items);
}

function readSearchParam(searchParams: SearchParamsLike, key: string): string | undefined {
  const value = searchParams?.get(key)?.trim();
  return value ? value : undefined;
}

function buildAdminContextHref(basePath: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function resolveAdminWorkspaceContext(
  pathname: string,
  searchParams?: SearchParamsLike,
): AdminWorkspaceContextSection | null {
  if (pathname === "/admin/leads" || pathname.startsWith("/admin/leads/")) {
    const tab = readSearchParam(searchParams, "tab");
    const status = readSearchParam(searchParams, "status");
    const view = readSearchParam(searchParams, "view") === "attention"
      ? "attention"
      : "pipeline";

    return {
      id: "admin-leads-workspace",
      label: "Current workspace",
      description: "Switch between pipeline and attention views from the shared workspace drawer.",
      currentItemId: view,
      items: [
        {
          id: "pipeline",
          label: "Pipeline",
          href: buildAdminContextHref("/admin/leads", { tab, status }),
          description: "Leads, consultations, deals, and training paths.",
        },
        {
          id: "attention",
          label: "Attention",
          href: buildAdminContextHref("/admin/leads", { view: "attention", tab, status }),
          description: "Submitted leads, overdue follow-ups, and queue heat.",
        },
      ],
    };
  }

  if (pathname === "/admin/conversations" || pathname.startsWith("/admin/conversations/")) {
    const status = readSearchParam(searchParams, "status");
    const lane = readSearchParam(searchParams, "lane");
    const sessionSource = readSearchParam(searchParams, "sessionSource");
    const rawView = readSearchParam(searchParams, "view");
    const view = rawView === "review"
      || rawView === "opportunities"
      || rawView === "themes"
      ? rawView
      : "inbox";

    return {
      id: "admin-conversations-workspace",
      label: "Current workspace",
      description: "Move between inbox, routing review, opportunities, and recurring themes from one drawer.",
      currentItemId: view,
      items: [
        {
          id: "inbox",
          label: "Inbox",
          href: buildAdminContextHref("/admin/conversations", { status, lane, sessionSource }),
          description: "Read-only conversation inspection and analytics.",
        },
        {
          id: "review",
          label: "Routing Review",
          href: "/admin/conversations?view=review",
          description: "Routing changes and follow-up-ready conversations.",
        },
        {
          id: "opportunities",
          label: "Opportunities",
          href: "/admin/conversations?view=opportunities",
          description: "Anonymous conversations with high-intent signals worth review.",
        },
        {
          id: "themes",
          label: "Themes",
          href: "/admin/conversations?view=themes",
          description: "Recurring pain patterns linked back to real conversations.",
        },
      ],
    };
  }

  if (pathname === "/admin/affiliates" || pathname.startsWith("/admin/affiliates/")) {
    const rawView = readSearchParam(searchParams, "view");
    const kind = readSearchParam(searchParams, "kind");
    const view = rawView === "leaderboard"
      || rawView === "pipeline"
      || rawView === "exceptions"
      ? rawView
      : "overview";

    return {
      id: "admin-affiliates-workspace",
      label: "Current workspace",
      description: "Switch between overview, leaderboard, pipeline, and exception review without leaving the shared drawer.",
      currentItemId: view,
      items: [
        {
          id: "overview",
          label: "Overview",
          href: "/admin/affiliates",
          description: "Global totals, program health, and top-level pressure.",
        },
        {
          id: "leaderboard",
          label: "Leaderboard",
          href: "/admin/affiliates?view=leaderboard",
          description: "Rankable affiliate performance with per-user drill-down.",
        },
        {
          id: "pipeline",
          label: "Pipeline",
          href: "/admin/affiliates?view=pipeline",
          description: "Program-level funnel and downstream milestone roll-up.",
        },
        {
          id: "exceptions",
          label: "Exceptions",
          href: buildAdminContextHref("/admin/affiliates", { view: "exceptions", kind }),
          description: "Invalid sources, disabled codes, missing joins, and credit review backlog.",
        },
      ],
    };
  }

  if (pathname === "/admin/journal"
    || pathname.startsWith("/admin/journal/")
    || pathname.startsWith("/admin/journal?")) {
    const currentItemId = pathname.startsWith("/admin/journal/attribution")
      ? "attribution"
      : "inventory";

    return {
      id: "admin-journal-workspace",
      label: "Current workspace",
      description: "Move between journal inventory and attribution without a second in-page rail.",
      currentItemId,
      items: [
        {
          id: "inventory",
          label: "Inventory",
          href: "/admin/journal",
          description: "Posts, filters, and editorial workflow states.",
        },
        {
          id: "attribution",
          label: "Attribution",
          href: "/admin/journal/attribution",
          description: "Content influence on conversations, leads, and revenue.",
        },
      ],
    };
  }

  return null;
}

export function isAdminNavigationItemActive(
  item: Pick<AdminNavigationItem, "href">,
  pathname: string,
): boolean {
  if (item.href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
