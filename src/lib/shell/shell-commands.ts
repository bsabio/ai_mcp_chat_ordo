import type { Command } from "@/core/commands/Command";
import { NavigationCommand } from "@/core/commands/NavigationCommands";
import { ThemeCommand } from "@/core/commands/ThemeCommands";
import type { MentionItem } from "@/core/entities/mentions";
import type { Theme } from "@/core/entities/theme";
import type { User as SessionUser } from "@/core/entities/user";

import { resolveCommandRoutes } from "./shell-navigation";

export interface ShellNavigationCommandDefinition {
  id: string;
  title: string;
  category: "Navigation";
  kind: "navigation";
  href: string;
}

export interface ShellThemeCommandDefinition {
  id: string;
  title: string;
  category: "Themes";
  kind: "theme";
  themeName: Theme;
}

export type ShellCommandDefinition =
  | ShellNavigationCommandDefinition
  | ShellThemeCommandDefinition;

export const SHELL_THEME_DEFINITIONS: readonly ShellThemeCommandDefinition[] = [
  {
    id: "theme-bauhaus",
    title: "Set Theme: Bauhaus",
    category: "Themes",
    kind: "theme",
    themeName: "bauhaus",
  },
  {
    id: "theme-swiss",
    title: "Set Theme: Swiss Grid",
    category: "Themes",
    kind: "theme",
    themeName: "swiss",
  },
  {
    id: "theme-skeuomorphic",
    title: "Set Theme: Skeuomorphic",
    category: "Themes",
    kind: "theme",
    themeName: "skeuomorphic",
  },
  {
    id: "theme-fluid",
    title: "Set Theme: Modern Fluid",
    category: "Themes",
    kind: "theme",
    themeName: "fluid",
  },
] as const;

export function resolveShellNavigationCommandDefinitions(
  user?: Pick<SessionUser, "roles"> | null,
): ShellNavigationCommandDefinition[] {
  return resolveCommandRoutes(user)
    .filter((route) => route.showInCommands)
    .map((route) => ({
      id: `nav-${route.id}`,
      title: route.label,
      category: "Navigation",
      kind: "navigation",
      href: route.href,
    }));
}

export const SHELL_NAVIGATION_COMMAND_DEFINITIONS: readonly ShellNavigationCommandDefinition[] =
  resolveShellNavigationCommandDefinitions();

export const SHELL_COMMAND_DEFINITIONS: readonly ShellCommandDefinition[] = [
  ...SHELL_NAVIGATION_COMMAND_DEFINITIONS,
  ...SHELL_THEME_DEFINITIONS,
] as const;

export function createShellCommands(options: {
  navigate: (path: string) => void;
  setTheme: (theme: Theme) => void;
  user?: Pick<SessionUser, "roles"> | null;
}): Command[] {
  const definitions: ShellCommandDefinition[] = [
    ...resolveShellNavigationCommandDefinitions(options.user),
    ...SHELL_THEME_DEFINITIONS,
  ];

  return definitions.map((definition) => {
    if (definition.kind === "navigation") {
      return new NavigationCommand(
        definition.id,
        definition.title,
        definition.category,
        options.navigate,
        definition.href,
      );
    }

    return new ThemeCommand(
      definition.id,
      definition.title,
      definition.category,
      options.setTheme,
      definition.themeName,
    );
  });
}

export function createCommandMentions(
  definitions: readonly ShellCommandDefinition[] = SHELL_COMMAND_DEFINITIONS,
): MentionItem[] {
  return definitions.map((definition) => ({
    id: definition.id,
    name: definition.title,
    category: "command",
    description: definition.category,
  }));
}