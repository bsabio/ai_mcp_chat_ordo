import type { NextRequest } from "next/server";
import { errorJson, runRouteTemplate, successJson } from "@/lib/chat/http-facade";
import { resolveUserId } from "@/lib/chat/resolve-user";
import { stopActiveStream } from "@/lib/chat/active-stream-registry";

type RouteParams = {
  params: Promise<{ streamId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  return runRouteTemplate({
    route: "/api/chat/streams/[streamId]/stop",
    request,
    execute: async (context) => {
      const { streamId } = await params;
      const { userId } = await resolveUserId();
      const stopped = stopActiveStream(streamId, userId);

      if (!stopped) {
        return errorJson(context, "Active stream not found", 404);
      }

      return successJson(context, {
        ok: true,
        stopped: true,
        streamId: stopped.streamId,
        conversationId: stopped.conversationId,
      });
    },
  });
}