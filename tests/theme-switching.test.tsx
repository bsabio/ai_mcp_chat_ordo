import { render, act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import type { Theme } from "@/core/entities/theme";

/* ------------------------------------------------------------------ */
/*  Helpers & mocks                                                   */
/* ------------------------------------------------------------------ */

const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] ?? null),
  setItem: vi.fn((key: string, val: string) => {
    localStorageMock.store[key] = val;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};

const skipTransitionMock = vi.fn();
const startViewTransitionMock = vi.fn((callback: () => void) => {
  callback();
  return {
    finished: Promise.resolve(),
    ready: Promise.resolve(),
    updateCallbackDone: Promise.resolve(),
    skipTransition: skipTransitionMock,
  };
});

function installMatchMedia(prefersDark = false) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches:
        query === "(prefers-color-scheme: dark)" ? prefersDark : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

/** Tiny test harness that exposes theme context via a ref. */
function ThemeHarness({ onContext }: { onContext: (ctx: ReturnType<typeof useTheme>) => void }) {
  const ctx = useTheme();
  React.useEffect(() => { onContext(ctx); });
  return <div data-testid="harness" />;
}

const THEMES: Theme[] = ["fluid", "bauhaus", "swiss", "skeuomorphic"];

/* ------------------------------------------------------------------ */
/*  Setup / teardown                                                  */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  localStorageMock.store = {};
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  startViewTransitionMock.mockClear();
  skipTransitionMock.mockClear();

  vi.stubGlobal("localStorage", localStorageMock);
  installMatchMedia(false);

  Object.defineProperty(document, "startViewTransition", {
    value: startViewTransitionMock,
    configurable: true,
  });
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
  });

  // Clean HTML element classes
  document.documentElement.className = "";
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.className = "";
});

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("ThemeProvider — theme switching", () => {
  it("applies defaults on mount (fluid, light)", async () => {
    let ctx: ReturnType<typeof useTheme>;
    render(
      <ThemeProvider>
        <ThemeHarness onContext={(c) => { ctx = c; }} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("theme-fluid")).toBe(true);
    });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(ctx!.theme).toBe("fluid");
    expect(ctx!.isDark).toBe(false);
  });

  it("restores theme from localStorage on mount", async () => {
    localStorageMock.store["pda-theme"] = "bauhaus";
    localStorageMock.store["pda-dark"] = "true";

    let ctx: ReturnType<typeof useTheme>;
    render(
      <ThemeProvider>
        <ThemeHarness onContext={(c) => { ctx = c; }} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("theme-bauhaus")).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
    expect(ctx!.theme).toBe("bauhaus");
    expect(ctx!.isDark).toBe(true);
  });

  it.each(THEMES)("switches to %s in light mode", async (targetTheme) => {
    let ctx: ReturnType<typeof useTheme>;
    render(
      <ThemeProvider>
        <ThemeHarness onContext={(c) => { ctx = c; }} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("theme-fluid")).toBe(true);
    });

    await act(() => { ctx!.setTheme(targetTheme); });

    await waitFor(() => {
      expect(document.documentElement.classList.contains(`theme-${targetTheme}`)).toBe(true);
    });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    // Only one theme class should be present
    for (const t of THEMES) {
      if (t !== targetTheme) {
        expect(document.documentElement.classList.contains(`theme-${t}`)).toBe(false);
      }
    }
  });

  it.each(THEMES)("switches to %s in dark mode", async (targetTheme) => {
    localStorageMock.store["pda-dark"] = "true";

    let ctx: ReturnType<typeof useTheme>;
    render(
      <ThemeProvider>
        <ThemeHarness onContext={(c) => { ctx = c; }} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    await act(() => { ctx!.setTheme(targetTheme); });

    await waitFor(() => {
      expect(document.documentElement.classList.contains(`theme-${targetTheme}`)).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("toggles dark mode off while preserving the active theme", async () => {
    localStorageMock.store["pda-theme"] = "swiss";
    localStorageMock.store["pda-dark"] = "true";

    let ctx: ReturnType<typeof useTheme>;
    render(
      <ThemeProvider>
        <ThemeHarness onContext={(c) => { ctx = c; }} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.classList.contains("theme-swiss")).toBe(true);
    });

    // Toggle dark off
    await act(() => { ctx!.setIsDark(false); });

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(document.documentElement.classList.contains("theme-swiss")).toBe(true);
    });
    expect(localStorageMock.store["pda-dark"]).toBe("false");
    expect(localStorageMock.store["pda-theme"]).toBe("swiss");
  });

  it("toggles dark mode on while preserving the active theme", async () => {
    localStorageMock.store["pda-theme"] = "skeuomorphic";

    let ctx: ReturnType<typeof useTheme>;
    render(
      <ThemeProvider>
        <ThemeHarness onContext={(c) => { ctx = c; }} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("theme-skeuomorphic")).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    await act(() => { ctx!.setIsDark(true); });

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.classList.contains("theme-skeuomorphic")).toBe(true);
    });
  });

  it("cycles through all 4 themes while dark, verifying each class swap", async () => {
    localStorageMock.store["pda-dark"] = "true";

    let ctx: ReturnType<typeof useTheme>;
    render(
      <ThemeProvider>
        <ThemeHarness onContext={(c) => { ctx = c; }} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    for (const targetTheme of THEMES) {
      await act(() => { ctx!.setTheme(targetTheme); });

      await waitFor(() => {
        expect(document.documentElement.classList.contains(`theme-${targetTheme}`)).toBe(true);
        expect(document.documentElement.classList.contains("dark")).toBe(true);
      });

      // Ensure only the target theme class remains
      for (const t of THEMES) {
        if (t !== targetTheme) {
          expect(document.documentElement.classList.contains(`theme-${t}`)).toBe(false);
        }
      }
    }
  });

  it("persists theme and dark state to localStorage", async () => {
    let ctx: ReturnType<typeof useTheme>;
    render(
      <ThemeProvider>
        <ThemeHarness onContext={(c) => { ctx = c; }} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(localStorageMock.store["pda-theme"]).toBe("fluid");
    });

    await act(() => { ctx!.setTheme("bauhaus"); });
    await act(() => { ctx!.setIsDark(true); });

    await waitFor(() => {
      expect(localStorageMock.store["pda-theme"]).toBe("bauhaus");
      expect(localStorageMock.store["pda-dark"]).toBe("true");
    });
  });

  it("skips the outgoing view transition when switching rapidly", async () => {
    let ctx: ReturnType<typeof useTheme>;
    render(
      <ThemeProvider>
        <ThemeHarness onContext={(c) => { ctx = c; }} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("theme-fluid")).toBe(true);
    });

    // Rapid-fire theme changes
    await act(() => { ctx!.setTheme("bauhaus"); });
    await act(() => { ctx!.setTheme("swiss"); });

    await waitFor(() => {
      expect(document.documentElement.classList.contains("theme-swiss")).toBe(true);
    });

    // The skipTransition guard should have been called for the interrupted transition
    expect(skipTransitionMock).toHaveBeenCalled();
  });

  it("detects system dark preference on first visit", async () => {
    installMatchMedia(true); // OS prefers dark

    render(
      <ThemeProvider>
        <ThemeHarness onContext={() => {}} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("stored dark preference overrides system preference", async () => {
    installMatchMedia(true); // OS prefers dark
    localStorageMock.store["pda-dark"] = "false"; // User explicitly chose light

    render(
      <ThemeProvider>
        <ThemeHarness onContext={() => {}} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(localStorageMock.store["pda-dark"]).toBe("false");
    });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("keeps anonymous visitors in light mode when system dark is preferred and no stored choice exists", async () => {
    installMatchMedia(true);

    render(
      <ThemeProvider respectSystemDarkMode={false}>
        <ThemeHarness onContext={() => {}} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("theme-fluid")).toBe(true);
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
