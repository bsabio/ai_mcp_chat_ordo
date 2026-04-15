import { MediaCompositionPlanSchema } from "@/lib/media/ffmpeg/media-composition-plan";
import { executeComposeMediaRemotely } from "@/lib/media/server/compose-media-worker-runtime";

interface NativeExecutionContext {
  userId?: string;
  conversationId?: string;
}

interface NativeComposeMediaRequest {
  plan?: unknown;
  __executionContext?: NativeExecutionContext;
}

async function readJsonFromStdin(): Promise<NativeComposeMediaRequest> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as NativeComposeMediaRequest;
}

async function main(): Promise<void> {
  const fixture = process.env.ORDO_NATIVE_COMPOSE_MEDIA_RESULT_FIXTURE?.trim();
  if (fixture) {
    process.stdout.write(fixture);
    return;
  }

  const request = await readJsonFromStdin();
  const plan = MediaCompositionPlanSchema.parse(request.plan);
  const userId = request.__executionContext?.userId?.trim();
  const conversationId = request.__executionContext?.conversationId?.trim() ?? null;

  if (!userId) {
    throw new Error("compose_media native target requires execution context with userId.");
  }

  const result = await executeComposeMediaRemotely({
    plan,
    userId,
    conversationId,
  });

  process.stdout.write(JSON.stringify(result));
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});