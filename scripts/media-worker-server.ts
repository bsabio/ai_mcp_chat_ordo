import { createServer } from "node:http";

import { MediaCompositionPlanSchema } from "@/lib/media/ffmpeg/media-composition-plan";
import { executeComposeMediaRemotely } from "@/lib/media/server/compose-media-worker-runtime";

const PORT = Number.parseInt(process.env.MEDIA_WORKER_PORT ?? "3101", 10);
const SHARED_SECRET = process.env.MEDIA_WORKER_SHARED_SECRET?.trim() ?? "";

function authorize(request: import("node:http").IncomingMessage): boolean {
  if (!SHARED_SECRET) {
    return true;
  }

  return request.headers.authorization === `Bearer ${SHARED_SECRET}`;
}

async function readJsonBody(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (request.method !== "POST" || request.url !== "/compose-media") {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  if (!authorize(request)) {
    response.writeHead(401, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  try {
    const raw = await readJsonBody(request) as Record<string, unknown>;
    const plan = MediaCompositionPlanSchema.parse(raw.plan);
    const userId = typeof raw.userId === "string" && raw.userId.trim().length > 0 ? raw.userId.trim() : null;
    const conversationId = typeof raw.conversationId === "string" && raw.conversationId.trim().length > 0
      ? raw.conversationId.trim()
      : null;

    if (!userId) {
      throw new Error("userId is required.");
    }

    const envelope = await executeComposeMediaRemotely({
      plan,
      userId,
      conversationId,
    });

    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(envelope));
  } catch (error) {
    response.writeHead(500, { "content-type": "application/json" });
    response.end(JSON.stringify({
      error: error instanceof Error ? error.message : "Compose media worker failed.",
    }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  process.stdout.write(`[media-worker] listening on :${PORT}\n`);
});
