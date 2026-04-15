import type { Command } from "./Command";

function normalizeCommandKey(value: string): string {
  return value.trim().replace(/^\/+/, "").toLowerCase();
}

/**
 * Singleton Registry for all system commands.
 * Powering the Slash Command system and Command Palette.
 */
export class CommandRegistry {
  private static instance: CommandRegistry;
  private commands: Map<string, Command> = new Map();

  private constructor() {}

  public static create(commands: readonly Command[] = []): CommandRegistry {
    const registry = new CommandRegistry();
    for (const command of commands) {
      registry.register(command);
    }
    return registry;
  }

  public static getInstance(): CommandRegistry {
    if (!this.instance) {
      this.instance = new CommandRegistry();
    }
    return this.instance;
  }

  public register(command: Command): void {
    this.commands.set(command.id, command);
  }

  public getCommand(id: string): Command | undefined {
    return this.commands.get(id);
  }

  public resolveCommand(idOrAlias: string): Command | undefined {
    const normalized = normalizeCommandKey(idOrAlias);
    if (!normalized) {
      return undefined;
    }

    const directMatch = this.commands.get(normalized);
    if (directMatch) {
      return directMatch;
    }

    return this.getAllCommands().find((command) =>
      command.aliases?.some((alias) => normalizeCommandKey(alias) === normalized) ?? false,
    );
  }

  public getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  public findCommands(query: string): Command[] {
    const normalizedQuery = normalizeCommandKey(query);
    return this.getAllCommands().filter((command) =>
      command.title.toLowerCase().includes(normalizedQuery)
      || command.category.toLowerCase().includes(normalizedQuery)
      || normalizeCommandKey(command.id).includes(normalizedQuery)
      || (command.aliases?.some((alias) => normalizeCommandKey(alias).includes(normalizedQuery)) ?? false)
    );
  }
}

export const commandRegistry = CommandRegistry.getInstance();
