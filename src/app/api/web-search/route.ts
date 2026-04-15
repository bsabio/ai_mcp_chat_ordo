import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { executeAdminWebSearch } from "@/core/use-cases/tools/admin-web-search.tool";
import {
  createAdminWebSearchErrorPayload,
  sanitizeAdminWebSearchInput,
  type WebSearchInput,
} from "@/lib/web-search/admin-web-search-payload";
import { logFailure } from "@/lib/observability/logger";
import { validateAdminWebSearchArgs } from "@/lib/capabilities/shared/web-search-tool";

export async function POST(req: Request) {
  let input: WebSearchInput = { query: "" };

  try {
    const user = await getSessionUser();
    input = sanitizeAdminWebSearchInput(await req.json());

    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        createAdminWebSearchErrorPayload(input, "Web search is restricted to administrators.", 403),
        { status: 403 },
      );
    }

    const validationError = validateAdminWebSearchArgs(input);
    if (validationError) {
      return NextResponse.json(
        createAdminWebSearchErrorPayload(input, validationError.error, validationError.code),
        { status: 400 },
      );
    }

    const result = await executeAdminWebSearch(input);

    return NextResponse.json(result);
  } catch (error) {
    logFailure("WEB_SEARCH_ERROR", "Web search route error", undefined, error);
    return NextResponse.json(
      createAdminWebSearchErrorPayload(input, "Internal server error during web search.", 500),
      { status: 500 },
    );
  }
}
