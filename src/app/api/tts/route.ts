import { NextResponse } from "next/server";
import fs from "fs";
import { getSessionUser } from "@/lib/auth";
import { getOpenaiApiKey } from "@/lib/config/env";
import { getDb } from "@/lib/db";
import { UserFileDataMapper } from "@/adapters/UserFileDataMapper";
import { UserFileSystem } from "@/lib/user-files";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (user.roles[0] === "ANONYMOUS") {
      return NextResponse.json(
        { error: "Audio generation requires authentication" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { text, conversationId } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Text is required for audio generation." },
        { status: 400 },
      );
    }

    const repo = new UserFileDataMapper(getDb());
    const ufs = new UserFileSystem(repo);

    // Check cache — return stored file if it exists
    const cached = await ufs.lookup(user.id, text, "audio");
    if (cached) {
      const data = fs.readFileSync(cached.diskPath);
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

    const oaResponse = await fetch("https://api.openai.com/v1/audio/speech", {
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
    });

    if (!oaResponse.ok) {
      const oaError = await oaResponse.text();
      console.error("OpenAI TTS Error:", oaError);
      return NextResponse.json(
        { error: "OpenAI TTS failed to generate audio." },
        { status: 502 },
      );
    }

    // Buffer the full response so we can cache it to disk
    const audioBuffer = Buffer.from(await oaResponse.arrayBuffer());

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
    console.error("TTS Route Error:", error);
    return NextResponse.json(
      { error: "Internal server error during audio generation." },
      { status: 500 },
    );
  }
}
