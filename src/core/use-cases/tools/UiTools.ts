import type { ToolCommand } from "../ToolCommand";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type { UserPreferencesRepository } from "@/core/ports/UserPreferencesRepository";

export class SetThemeCommand implements ToolCommand<{ theme: string }, string> {
  async execute({ theme }: { theme: string }, _context?: ToolExecutionContext) {
    if (!theme) throw new Error("Theme must be provided.");
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

export class GenerateChartCommand implements ToolCommand<{ code: string }, string> {
  async execute(_input: { code: string }, _context?: ToolExecutionContext) {
    return `Success. Chart generated and rendered silently on the client.`;
  }
}

export class GenerateAudioCommand implements ToolCommand<{ text: string; title: string }, string> {
  async execute(_input: { text: string; title: string }, _context?: ToolExecutionContext) {
    return `Success. Audio player UI component appended to the chat stream.`;
  }
}
