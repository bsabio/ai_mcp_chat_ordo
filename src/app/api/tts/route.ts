import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { getSessionUser } from "@/lib/auth";
import { getOpenaiApiKey } from "@/lib/config/env";
import { getDb } from "@/lib/db";
import { UserFileDataMapper } from "@/adapters/UserFileDataMapper";
import { UserFileSystem } from "@/lib/user-files";
import { TtsRequestSchema } from "./schema";
import { logFailure } from "@/lib/observability/logger";
import { REASON_CODES } from "@/lib/observability/reason-codes";

const TTS_FETCH_TIMEOUT_MS = 30_000;
const TTS_MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (user.roles[0] === "ANONYMOUS") {
      return NextResponse.json(
        { error: "Audio generation requires authentication" },
        { status: 403 },
      );
    }

    const raw = await req.json();
    const parseResult = TtsRequestSchema.safeParse(raw);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Text is required for audio generation." },
        { status: 400 },
      );
    }
    const { text, conversationId } = parseResult.data;

    const repo = new UserFileDataMapper(getDb());
    const ufs = new UserFileSystem(repo);

    // Check cache — return stored file if it exists
    const cached = await ufs.lookup(user.id, text, "audio");
    if (cached) {
      const data = await readFile(cached.diskPath);
      return new NextResponse(data, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": String(data.length),
          "Cache-Control": "private, max-age=86400, immutable",
          "X-User-File-Id": cached.file.id,
        },
      });
    }

    // --- OpenAI TTS (default) — generate, cache, and return ---
    let openaiApiKey: string;
    try {
      openaiApiKey = getOpenaiApiKey();
    } catch {
      return NextResponse.json(
        { error: "No OPENAI_API_KEY configured. Add it to .env.local to enable TTS." },
        { status: 500 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TTS_FETCH_TIMEOUT_MS);

    let oaResponse: Response;
    try {
      oaResponse = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: "alloy",
          response_format: "mp3",
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!oaResponse.ok) {
      const _oaError = await oaResponse.text();
      logFailure(REASON_CODES.TTS_PROVIDER_FAILED, "OpenAI TTS failed", { status: oaResponse.status });
      return NextResponse.json(
        { error: "OpenAI TTS failed to generate audio." },
        { status: 502 },
      );
    }

    // Buffer the full response with size guard
    const arrayBuffer = await oaResponse.arrayBuffer();
    if (arrayBuffer.byteLength > TTS_MAX_RESPONSE_BYTES) {
      logFailure(REASON_CODES.TTS_PROVIDER_FAILED, "TTS response exceeded size limit", {
        bytes: arrayBuffer.byteLength,
        limit: TTS_MAX_RESPONSE_BYTES,
      });
      return NextResponse.json(
        { error: "TTS response too large." },
        { status: 502 },
      );
    }
    const audioBuffer = Buffer.from(arrayBuffer);

    // Store in user filesystem
    const userFile = await ufs.store({
      userId: user.id,
      conversationId: conversationId ?? null,
      input: text,
      fileType: "audio",
      mimeType: "audio/mpeg",
      extension: "mp3",
      data: audioBuffer,
    });

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.length),
        "Cache-Control": "private, max-age=86400, immutable",
        "X-User-File-Id": userFile.id,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logFailure(REASON_CODES.TTS_TIMEOUT, "TTS request timed out", {});
      return NextResponse.json(
        { error: "TTS request timed out" },
        { status: 504 },
      );
    }
    logFailure(REASON_CODES.UNKNOWN_ROUTE_ERROR, "TTS route error", {}, error);
    return NextResponse.json(
      { error: "Internal server error during audio generation." },
      { status: 500 },
    );
  }
}
