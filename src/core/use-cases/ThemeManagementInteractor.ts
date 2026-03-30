import type { Theme } from "../entities/theme";
import {
  getThemeManifest,
  getThemeManifestEntry,
  isSupportedTheme,
  type ManifestTheme,
} from "@/lib/theme/theme-manifest";

export type ThemeMetadata = ManifestTheme;

export class ThemeManagementInteractor {
  validateTheme(themeId: string): themeId is Theme {
    return isSupportedTheme(themeId);
  }

  getThemeMetadata(themeId: Theme): ThemeMetadata {
    return getThemeManifestEntry(themeId);
  }

  getAllThemes(): readonly ThemeMetadata[] {
    return getThemeManifest();
  }
}
