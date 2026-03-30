import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function listFiles(relativeDir: string): string[] {
  const absoluteDir = join(process.cwd(), relativeDir);
  const entries = readdirSync(absoluteDir);

  return entries.flatMap((entry) => {
    const relativePath = `${relativeDir}/${entry}`;
    const absolutePath = join(process.cwd(), relativePath);

    if (statSync(absolutePath).isDirectory()) {
      return listFiles(relativePath);
    }

    return relativePath;
  });
}

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

function countMatches(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length;
}

describe("TD-C3 hardening audit", () => {
  it("F5: tests do not replace process.env wholesale", () => {
    const offenders = listFiles("tests")
      .filter((path) => path.endsWith(".test.ts") || path.endsWith(".test.tsx"))
      .filter((path) => /process\.env\s*=/.test(readSource(path)));

    expect(offenders).toEqual([]);
  });

  it("F6: accepted bare-catch inventory in src stays explicit", () => {
    const files = listFiles("src")
      .filter((path) => path.endsWith(".ts") || path.endsWith(".tsx"));

    const inventory = files
      .map((path) => ({
        path,
        count: countMatches(readSource(path), /catch\s*\{/g),
      }))
      .filter((entry) => entry.count > 0)
      .map((entry) => `${entry.path}:${entry.count}`)
      .sort();

    expect(inventory).toEqual([
      "src/adapters/AnthropicBlogArticlePipelineModel.ts:2",
      "src/adapters/ChatPresenter.ts:3",
      "src/adapters/ChatStreamAdapter.ts:1",
      "src/adapters/FileSystemCorpusRepository.ts:4",
      "src/adapters/MessageDataMapper.ts:1",
      "src/app/api/blog/assets/[id]/route.ts:1",
      "src/app/api/jobs/_lib.ts:1",
      "src/app/api/tts/route.ts:1",
      "src/app/library/[document]/[section]/page.tsx:1",
      "src/app/login/page.tsx:1",
      "src/app/register/page.tsx:1",
      "src/components/AudioPlayer.tsx:1",
      "src/components/ContentModal.tsx:1",
      "src/components/GraphRenderer.tsx:1",
      "src/components/MermaidRenderer.tsx:1",
      "src/components/WebSearchResultCard.tsx:1",
      "src/components/profile/ProfileSettingsPanel.tsx:1",
      "src/core/use-cases/tools/UiTools.ts:1",
      "src/core/use-cases/tools/graph-payload.ts:1",
      "src/frameworks/ui/MessageList.tsx:1",
      "src/frameworks/ui/useChatSurfaceState.tsx:1",
      "src/hooks/chat/useChatJobEvents.ts:2",
      "src/hooks/useChatPushNotifications.ts:1",
      "src/lib/auth.ts:2",
      "src/lib/chat/anthropic-stream.ts:1",
      "src/lib/chat/disposability.ts:1",
      "src/lib/chat/sse-parser.ts:1",
      "src/lib/config/instance.ts:1",
      "src/lib/db/startup-check.ts:1",
      "src/lib/evals/staging-canary.ts:1",
      "src/lib/push/browser-push.ts:1",
      "src/lib/theme/theme-state.ts:3",
    ]);
  });
});