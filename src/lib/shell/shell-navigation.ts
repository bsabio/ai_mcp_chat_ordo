import type { RoleName, User as SessionUser } from "@/core/entities/user";
import { DEFAULT_IDENTITY } from "@/lib/config/defaults";

export type ShellRouteKind = "internal" | "external";

type ShellVisibility = "all" | readonly RoleName[];

export interface ShellRouteDefinition {
  id: string;
  label: string;
  href: string;
  kind: ShellRouteKind;
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
  },
  {
    id: "corpus",
    label: "Library",
    href: "/library",
    kind: "internal",
    footerVisibility: "all",
    showInCommands: true,
  },

  {
    id: "profile",
    label: "Profile",
    href: "/profile",
    kind: "internal",
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
    routeIds: ["corpus"],
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

export const ACCOUNT_MENU_ROUTE_IDS = ["profile"] as const;

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