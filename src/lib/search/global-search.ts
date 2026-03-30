import type { User as SessionUser } from "@/core/entities/user";
import type { ContentAudience } from "@/lib/access/content-access";
import { searchAdminEntities, type AdminSearchResult } from "@/lib/admin/search/admin-search";
import { resolveCommandRoutes, type ShellRouteDefinition } from "@/lib/shell/shell-navigation";

export interface GlobalSearchResult {
  kind: "route" | "document" | "section" | "admin-entity";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  audience: ContentAudience | "route";
  source: "shell" | "corpus" | "admin";
  updatedAt?: string;
  entityType?: AdminSearchResult["entityType"];
}

export type GlobalSearchAction = (formData: FormData) => Promise<GlobalSearchResult[]>;

interface GlobalSearchContext {
  id: string;
  roles: SessionUser["roles"];
}

function mapRouteResult(route: ShellRouteDefinition): GlobalSearchResult {
  return {
    kind: "route",
    id: route.id,
    title: route.label,
    subtitle: route.description ?? route.href,
    href: route.href,
    audience: "route",
    source: "shell",
  };
}

function mapAdminResult(result: AdminSearchResult): GlobalSearchResult {
  return {
    kind: "admin-entity",
    id: `${result.entityType}:${result.id}`,
    title: result.title,
    subtitle: result.subtitle,
    href: result.href,
    audience: "admin",
    source: "admin",
    updatedAt: result.updatedAt,
    entityType: result.entityType,
  };
}

export async function searchGlobalEntities(
  query: string,
  context: GlobalSearchContext,
): Promise<GlobalSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const lowered = trimmed.toLowerCase();
  const shellRoutes = resolveCommandRoutes({ roles: context.roles })
    .filter(
      (route) =>
        route.label.toLowerCase().includes(lowered)
        || route.href.toLowerCase().includes(lowered)
        || route.description?.toLowerCase().includes(lowered),
    )
    .map(mapRouteResult);

  const adminResults = context.roles.includes("ADMIN")
    ? (await searchAdminEntities(trimmed, { limit: 10 })).map(mapAdminResult)
    : [];

  const deduped = new Map<string, GlobalSearchResult>();
  for (const result of [...shellRoutes, ...adminResults]) {
    deduped.set(`${result.kind}:${result.href}`, result);
  }

  return Array.from(deduped.values()).slice(0, 20);
}