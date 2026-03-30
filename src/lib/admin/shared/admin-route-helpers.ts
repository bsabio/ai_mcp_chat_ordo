/**
 * Factory for admin entity route helpers.
 * Each entity calls createAdminEntityRoutes once and gets list/detail/preview paths.
 */

export interface AdminEntityRoutes {
  list(): string;
  detail(id: string): string;
  preview?(slug: string): string;
}

export function createAdminEntityRoutes(
  basePath: string,
  options?: { preview?: boolean },
): AdminEntityRoutes {
  const routes: AdminEntityRoutes = {
    list: () => basePath,
    detail: (id: string) => `${basePath}/${encodeURIComponent(id)}`,
  };

  if (options?.preview) {
    routes.preview = (slug: string) => `${basePath}/preview/${encodeURIComponent(slug)}`;
  }

  return routes;
}
