import { CAPABILITY_CATALOG } from "@/core/capability-catalog/catalog";
import { buildCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-projection";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import {
  resolveCurrentPageDetails,
  type CurrentPageDetails,
} from "@/lib/chat/current-page-context";

interface GetCurrentPageInput {
  pathname?: string;
}

type GetCurrentPageOutput = CurrentPageDetails;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseGetCurrentPageInput(value: unknown): GetCurrentPageInput {
  if (value === undefined || value === null) {
    return {};
  }

  if (!isRecord(value)) {
    throw new Error("get_current_page input must be an object.");
  }

  if (value.pathname !== undefined && typeof value.pathname !== "string") {
    throw new Error("get_current_page pathname must be a string when provided.");
  }

  return value.pathname === undefined ? {} : { pathname: value.pathname };
}

export async function executeGetCurrentPage(
  { pathname }: GetCurrentPageInput,
  context?: ToolExecutionContext,
): Promise<GetCurrentPageOutput> {
  const authoritativePathname = context?.currentPageSnapshot?.pathname
    ?? context?.currentPathname
    ?? pathname;

  if (!authoritativePathname) {
    throw new Error("pathname is required.");
  }

  return resolveCurrentPageDetails(authoritativePathname, context?.currentPageSnapshot);
}

export const getCurrentPageTool = buildCatalogBoundToolDescriptor(
  CAPABILITY_CATALOG.get_current_page,
  {
    parse: parseGetCurrentPageInput,
    execute: (input, context) => executeGetCurrentPage(input, context),
  },
);
