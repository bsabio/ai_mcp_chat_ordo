import type { RoleName, User as SessionUser } from "@/core/entities/user";
import { DEFAULT_IDENTITY } from "@/lib/config/defaults";

export type ShellRouteKind = "internal" | "external";

type ShellVisibility = "all" | readonly RoleName[];

export interface ShellRouteDefinition {
  id: string;
  label: string;
  href: string;
  kind: ShellRouteKind;
  description?: string;
  isLegacy?: boolean;
  showInCommands?: boolean;
  headerVisibility?: ShellVisibility;
  footerVisibility?: ShellVisibility;
  accountVisibility?: ShellVisibility;
}

export interface ShellFooterGroup {
  id: string;
  label: string;
  routeIds: string[];
  visibility: ShellVisibility;
}

export interface ShellBrandMetadata {
  name: string;
  shortName: string;
  homeHref: string;
  ariaLabel: string;
  markText: string;
}

export const SHELL_BRAND: ShellBrandMetadata = {
  name: DEFAULT_IDENTITY.name,
  shortName: DEFAULT_IDENTITY.shortName,
  homeHref: "/",
  ariaLabel: `${DEFAULT_IDENTITY.name} home`,
  markText: DEFAULT_IDENTITY.markText,
};

const SIGNED_IN_ROLES = ["AUTHENTICATED", "STAFF", "ADMIN"] as const;

export const SHELL_ROUTES: readonly ShellRouteDefinition[] = [
  {
    id: "home",
    label: "Home",
    href: "/",
    kind: "internal",
    description: "Return to the main homepage and chat entry point.",
    footerVisibility: "all",
  },
  {
    id: "corpus",
    label: "Library",
    href: "/library",
    kind: "internal",
    description: "Browse the library and structured reference material.",
    footerVisibility: "all",
    showInCommands: true,
  },
  {
    id: "blog",
    label: "Blog",
    href: "/blog",
    kind: "internal",
    description: "Read published journal and blog content.",
    footerVisibility: "all",
    showInCommands: true,
  },
  {
    id: "admin-dashboard",
    label: "Admin",
    href: "/admin",
    kind: "internal",
    description: "Open the admin dashboard overview.",
    accountVisibility: ["ADMIN"],
    footerVisibility: ["ADMIN"],
    showInCommands: true,
  },

  {
    id: "jobs",
    label: "Jobs",
    href: "/jobs",
    kind: "internal",
    description: "Review current and recent deferred jobs.",
    footerVisibility: SIGNED_IN_ROLES,
    accountVisibility: SIGNED_IN_ROLES,
  },
  {
    id: "journal-admin",
    label: "Journal",
    href: "/admin/journal",
    kind: "internal",
    description: "Manage journal inventory, workflow, and preview states.",
    accountVisibility: ["STAFF", "ADMIN"],
    footerVisibility: ["ADMIN"],
    showInCommands: true,
  },
  {
    id: "admin-users",
    label: "Users",
    href: "/admin/users",
    kind: "internal",
    description: "Review people, roles, and account context.",
    accountVisibility: ["ADMIN"],
    footerVisibility: ["ADMIN"],
    showInCommands: true,
  },
  {
    id: "admin-system",
    label: "System",
    href: "/admin/system",
    kind: "internal",
    description: "Inspect feature flags, model policy, and runtime status.",
    accountVisibility: ["ADMIN"],
    footerVisibility: ["ADMIN"],
    showInCommands: true,
  },
  {
    id: "admin-leads",
    label: "Leads",
    href: "/admin/leads",
    kind: "internal",
    description: "Review operator lead queue and next actions.",
    accountVisibility: ["ADMIN"],
    footerVisibility: ["ADMIN"],
    showInCommands: true,
  },
  {
    id: "admin-prompts",
    label: "Prompts",
    href: "/admin/prompts",
    kind: "internal",
    description: "Configure system prompts and prompt templates.",
    accountVisibility: ["ADMIN"],
    footerVisibility: ["ADMIN"],
    showInCommands: true,
  },
  {
    id: "admin-conversations",
    label: "Conversations",
    href: "/admin/conversations",
    kind: "internal",
    description: "Browse and inspect conversation transcripts.",
    accountVisibility: ["ADMIN"],
    footerVisibility: ["ADMIN"],
    showInCommands: true,
  },
  {
    id: "admin-jobs",
    label: "Jobs",
    href: "/admin/jobs",
    kind: "internal",
    description: "Monitor deferred jobs, queue health, and execution logs.",
    accountVisibility: ["ADMIN"],
    footerVisibility: ["ADMIN"],
    showInCommands: true,
  },
  {
    id: "profile",
    label: "Profile",
    href: "/profile",
    kind: "internal",
    description: "View profile, referral, and personal settings.",
    footerVisibility: SIGNED_IN_ROLES,
    accountVisibility: SIGNED_IN_ROLES,
  },
  {
    id: "login",
    label: "Login",
    href: "/login",
    kind: "internal",
    footerVisibility: ["ANONYMOUS"],
  },
  {
    id: "register",
    label: "Register",
    href: "/register",
    kind: "internal",
    footerVisibility: ["ANONYMOUS"],
  },
  {
    id: "legacy-books-index",
    label: "Legacy Books Index",
    href: "/books",
    kind: "internal",
    isLegacy: true,
  },
  {
    id: "legacy-book-chapter",
    label: "Legacy Book Chapter Redirect",
    href: "/book/[chapter]",
    kind: "internal",
    isLegacy: true,
  },
] as const;

function getActiveRoles(user?: Pick<SessionUser, "roles"> | null): readonly RoleName[] {
  return user?.roles?.length ? user.roles : ["ANONYMOUS"];
}

function matchesVisibility(
  visibility: ShellVisibility | undefined,
  user?: Pick<SessionUser, "roles"> | null,
): boolean {
  if (!visibility) {
    return false;
  }

  if (visibility === "all") {
    return true;
  }

  const roles = getActiveRoles(user);
  return roles.some((role) => visibility.includes(role));
}

export function resolvePrimaryNavRoutes(
  user?: Pick<SessionUser, "roles"> | null,
): ShellRouteDefinition[] {
  return SHELL_ROUTES.filter((route) => matchesVisibility(route.headerVisibility, user));
}

export function resolveCommandRoutes(
  user?: Pick<SessionUser, "roles"> | null,
): ShellRouteDefinition[] {
  return SHELL_ROUTES.filter(
    (route) =>
      route.showInCommands &&
      matchesVisibility(
        route.footerVisibility ?? route.headerVisibility ?? route.accountVisibility,
        user,
      ),
  );
}

export const PRIMARY_NAV_ITEMS: readonly ShellRouteDefinition[] = resolvePrimaryNavRoutes();

export const SHELL_FOOTER_GROUPS: readonly ShellFooterGroup[] = [
  {
    id: "information",
    label: "Information",
    routeIds: ["corpus", "blog"],
    visibility: "all",
  },
  {
    id: "workspace",
    label: "Workspace",
    routeIds: ["profile"],
    visibility: SIGNED_IN_ROLES,
  },
  {
    id: "access",
    label: "Access",
    routeIds: ["login", "register"],
    visibility: ["ANONYMOUS"],
  },
] as const;

export const ACCOUNT_MENU_ROUTE_IDS = ["admin-dashboard", "jobs", "journal-admin", "profile"] as const;

export const SHELL_ROUTE_BY_ID = new Map(
  SHELL_ROUTES.map((route) => [route.id, route] as const),
);

export function getShellRouteById(routeId: string): ShellRouteDefinition {
  const route = SHELL_ROUTE_BY_ID.get(routeId);
  if (!route) {
    throw new Error(`Unknown shell route id: ${routeId}`);
  }

  return route;
}

export function resolveFooterGroups(
  user?: Pick<SessionUser, "roles"> | null,
): ShellFooterGroup[] {
  return SHELL_FOOTER_GROUPS.filter(
    (group) =>
      matchesVisibility(group.visibility, user) &&
      resolveFooterGroupRoutes(group, user).length > 0,
  );
}

export function resolveFooterGroupRoutes(
  group: ShellFooterGroup,
  user?: Pick<SessionUser, "roles"> | null,
): ShellRouteDefinition[] {
  return group.routeIds
    .map(getShellRouteById)
    .filter((route) => matchesVisibility(route.footerVisibility, user));
}

export function resolveAccountMenuRoutes(
  user?: Pick<SessionUser, "roles"> | null,
): ShellRouteDefinition[] {
  return ACCOUNT_MENU_ROUTE_IDS
    .map(getShellRouteById)
    .filter((route) => matchesVisibility(route.accountVisibility, user));
}

export function resolveShellHomeHref(): string {
  return SHELL_BRAND.homeHref;
}

export function isShellRouteActive(
  route: ShellRouteDefinition,
  pathname: string,
): boolean {
  if (route.kind !== "internal") {
    return false;
  }

  if (route.href === "/") {
    return pathname === "/";
  }

  return pathname === route.href || pathname.startsWith(`${route.href}/`);
}