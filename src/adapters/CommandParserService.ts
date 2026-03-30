import type { UICommand} from "../core/entities/ui-command";
import { UI_COMMAND_TYPE } from "../core/entities/ui-command";
import { isSupportedTheme } from "@/lib/theme/theme-manifest";

const UI_COMMAND_REGEX = /__ui_command__:(\w+):([^\s]+)/g;

export class CommandParserService {
  parse(text: string): UICommand[] {
    const commands: UICommand[] = [];
    const matches = text.matchAll(UI_COMMAND_REGEX);

    for (const m of matches) {
      const action = m[1];
      const value = m[2];

      if (action === UI_COMMAND_TYPE.SET_THEME && isSupportedTheme(value)) {
        commands.push({ type: UI_COMMAND_TYPE.SET_THEME, theme: value });
      } else if (action === UI_COMMAND_TYPE.NAVIGATE) {
        commands.push({ type: UI_COMMAND_TYPE.NAVIGATE, path: value });
      }
    }

    return commands;
  }
}
