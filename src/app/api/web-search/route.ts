import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  adminWebSearch,
  type WebSearchToolDeps,
} from "../../../../mcp/web-search-tool";
import OpenAI from "openai";

let cachedDeps: WebSearchToolDeps | null = null;
function getDeps(): WebSearchToolDeps {
  if (!cachedDeps) {
    cachedDeps = { openai: new OpenAI() };
  }
  return cachedDeps;
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "Web search is restricted to administrators." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { query, allowed_domains, model } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "query is required and must be a string." },
        { status: 400 },
      );
    }

    const result = await adminWebSearch(getDeps(), {
      query,
      allowed_domains: Array.isArray(allowed_domains) ? allowed_domains : undefined,
      model: typeof model === "string" ? model : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Web Search Route Error:", error);
    return NextResponse.json(
      { error: "Internal server error during web search." },
      { status: 500 },
    );
  }
}
