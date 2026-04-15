import type { ToolCommand } from "../ToolCommand";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type { UserPreferencesRepository } from "@/core/ports/UserPreferencesRepository";
import { resolveGenerateChartPayload, type GenerateChartInput } from "./chart-payload";
import { resolveGenerateGraphPayload, type GenerateGraphInput, type ResolvedGraphPayload } from "./graph-payload";
import { resolveGraphDataSource } from "@/lib/graphs/graph-data-sources";
import { estimateAudioDurationSeconds, estimateAudioGenerationSeconds } from "@/lib/audio/audio-estimates";
import { SUPPORTED_THEME_IDS } from "@/lib/theme/theme-manifest";

export class SetThemeCommand implements ToolCommand<{ theme: string }, string> {
  async execute({ theme }: { theme: string }, _context?: ToolExecutionContext) {
    if (!theme) throw new Error("Theme must be provided.");
    if (!SUPPORTED_THEME_IDS.includes(theme as (typeof SUPPORTED_THEME_IDS)[number])) {
      throw new Error(`Theme "${theme}" is not supported.`);
    }
    return `Success. The theme has been changed to ${theme}.`;
  }
}

export class AdjustUICommand implements ToolCommand<Record<string, unknown>, string> {
  constructor(private readonly preferencesRepo?: UserPreferencesRepository) {}

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext) {
    const applied: string[] = [];
    if (args.preset) applied.push(`preset=${args.preset}`);
    if (args.fontSize) applied.push(`fontSize=${args.fontSize}`);
    if (args.lineHeight) applied.push(`lineHeight=${args.lineHeight}`);
    if (args.letterSpacing) applied.push(`letterSpacing=${args.letterSpacing}`);
    if (args.density) applied.push(`density=${args.density}`);
    if (args.dark !== undefined) applied.push(`dark=${args.dark}`);
    if (args.theme) applied.push(`theme=${args.theme}`);
    if (args.colorBlindMode) applied.push(`colorBlindMode=${args.colorBlindMode}`);

    // Dual-write: persist UI preferences server-side for authenticated users
    if (context && context.role !== "ANONYMOUS" && this.preferencesRepo) {
      try {
        if (args.theme) await this.preferencesRepo.set(context.userId, "theme", String(args.theme));
        if (args.dark !== undefined) await this.preferencesRepo.set(context.userId, "dark_mode", String(args.dark));
        if (args.fontSize) await this.preferencesRepo.set(context.userId, "font_size", String(args.fontSize));
        if (args.density) await this.preferencesRepo.set(context.userId, "density", String(args.density));
        if (args.colorBlindMode) await this.preferencesRepo.set(context.userId, "color_blind_mode", String(args.colorBlindMode));
      } catch {
        // Server persistence failed — localStorage still works via client
      }
    }

    return `Success. UI adjusted: ${applied.join(", ")}.`;
  }
}

export class NavigateCommand implements ToolCommand<{ path: string }, string> {
  async execute({ path }: { path: string }, _context?: ToolExecutionContext) {
    if (!path) throw new Error("Path must be provided.");
    return `Success. Navigated to ${path}.`;
  }
}

export class GenerateChartCommand implements ToolCommand<GenerateChartInput, string> {
  async execute(input: GenerateChartInput, _context?: ToolExecutionContext) {
    const payload = resolveGenerateChartPayload(input as Record<string, unknown>);

    return `Success. Chart generated and rendered silently on the client using Mermaid syntax beginning with ${payload.code.split("\n")[0]}.`;
  }
}

export class GenerateGraphCommand implements ToolCommand<GenerateGraphInput, ResolvedGraphPayload> {
  async execute(input: GenerateGraphInput, context?: ToolExecutionContext) {
    const source = input.data?.source;
    const sourceData = source
      ? await resolveGraphDataSource(source, context ?? { role: "ANONYMOUS", userId: "anonymous" })
      : undefined;

    return resolveGenerateGraphPayload(input as Record<string, unknown>, { sourceData });
  }
}

export class GenerateAudioCommand implements ToolCommand<{ text: string; title: string; assetId?: string }, {
  action: "generate_audio";
  title: string;
  text: string;
  assetId: string | null;
  assetKind: "audio";
  mimeType: "audio/mpeg";
  assetSource: "generated";
  provider: string;
  generationStatus: "client_fetch_pending" | "cached_asset";
  estimatedDurationSeconds: number;
  estimatedGenerationSeconds: number;
}> {
  async execute(
    input: { text: string; title: string; assetId?: string },
    _context?: ToolExecutionContext,
  ): Promise<{
    action: "generate_audio";
    title: string;
    text: string;
    assetId: string | null;
      assetKind: "audio";
      mimeType: "audio/mpeg";
      assetSource: "generated";
    provider: string;
    generationStatus: "client_fetch_pending" | "cached_asset";
    estimatedDurationSeconds: number;
    estimatedGenerationSeconds: number;
  }> {
    return {
      action: "generate_audio",
      title: input.title,
      text: input.text,
      assetId: input.assetId ?? null,
      assetKind: "audio",
      mimeType: "audio/mpeg",
      assetSource: "generated",
      provider: input.assetId ? "user-file-cache" : "openai-speech",
      generationStatus: input.assetId ? "cached_asset" : "client_fetch_pending",
      estimatedDurationSeconds: estimateAudioDurationSeconds(input.text),
      estimatedGenerationSeconds: estimateAudioGenerationSeconds(input.text),
    };
  }
}
