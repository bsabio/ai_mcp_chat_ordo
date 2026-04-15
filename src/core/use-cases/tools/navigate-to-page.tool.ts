import { CAPABILITY_CATALOG } from "@/core/capability-catalog/catalog";
import { buildCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-projection";
import { SHELL_ROUTES } from "@/lib/shell/shell-navigation";

interface NavigateToPageInput {
  path: string;
}

interface NavigateToPageOutput {
  path: string;
  label: string | null;
  description: string | null;
  __actions__: Array<{ type: "navigate"; path: string }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseNavigateToPageInput(value: unknown): NavigateToPageInput {
  if (!isRecord(value)) {
    throw new Error("navigate_to_page input must be an object.");
  }

  if (typeof value.path !== "string" || value.path.length === 0) {
    throw new Error("path is required.");
  }

  return { path: value.path };
}

export async function executeNavigateToPage(
  { path }: NavigateToPageInput,
): Promise<NavigateToPageOutput> {
  if (!path) {
    throw new Error("path is required.");
  }

  const match = SHELL_ROUTES
    .filter((route) => route.kind === "internal" && (route.href === path || path.startsWith(route.href + "/")))
    .sort((left, right) => right.href.length - left.href.length)[0];

  if (!match) {
    throw new Error(`Unknown page: ${path}. Use list_available_pages to see valid destinations.`);
  }

  return {
    path: match.href,
    label: match.label,
    description: match.description ?? null,
    __actions__: [{ type: "navigate", path: match.href }],
  };
}

export const navigateToPageTool = buildCatalogBoundToolDescriptor(
  CAPABILITY_CATALOG.navigate_to_page,
  {
    parse: parseNavigateToPageInput,
    execute: (input) => executeNavigateToPage(input),
  },
);
