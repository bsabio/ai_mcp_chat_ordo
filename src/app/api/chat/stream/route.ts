import type { NextRequest } from "next/server";
import { runRouteTemplate } from "@/lib/chat/http-facade";
import { ChatStreamPipeline } from "@/lib/chat/stream-pipeline";
import { executeChatStreamRoute } from "@/lib/chat/stream-route-handler";

const pipeline = new ChatStreamPipeline();

export async function POST(request: NextRequest) {
  return runRouteTemplate({
    route: "/api/chat/stream",
    request,
    execute: async (context) => executeChatStreamRoute({ request, context, pipeline }),
  });
}
