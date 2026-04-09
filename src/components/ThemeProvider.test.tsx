import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, useTheme } from "./ThemeProvider";
import type { ThemeStateSnapshot } from "@/lib/theme/theme-state";

const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
};

function installMatchMedia() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
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

function ThemeStateProbe() {
  const { theme } = useTheme();

  return <div data-testid="theme-state" data-theme={theme} />;
}

function ThemeMutationProbe() {
  const { setTheme, setIsDark } = useTheme();

  return (
    <>
      <button type="button" onClick={() => setTheme("swiss")}>Switch Theme</button>
      <button type="button" onClick={() => setIsDark(true)}>Enable Dark</button>
    </>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorageMock.store = {};
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ preferences: [] }),
    }));
    installMatchMedia();
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
    Object.defineProperty(document, "startViewTransition", {
      value: vi.fn((callback: () => void) => {
        callback();
        return {
          ready: Promise.resolve(),
          finished: Promise.resolve(),
          updateCallbackDone: Promise.resolve(),
          skipTransition: vi.fn(),
        };
      }),
      configurable: true,
    });
    document.documentElement.className = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-mode");
    document.documentElement.removeAttribute("data-theme-transition");
    document.documentElement.removeAttribute("data-density");
    document.documentElement.removeAttribute("data-color-blind");
    document.documentElement.removeAttribute("style");
  });

  it("honors the server-seeded initial theme state", async () => {
    const initialThemeState: ThemeStateSnapshot = {
      theme: "swiss",
      isDark: true,
      accessibility: {
        fontSize: "lg",
        lineHeight: "relaxed",
        letterSpacing: "tight",
        density: "compact",
        colorBlindMode: "deuteranopia",
      },
    };

    render(
      <ThemeProvider initialThemeState={initialThemeState}>
        <ThemeStateProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-state")).toHaveAttribute("data-theme", "swiss");
    });

    expect(document.documentElement.classList.contains("theme-swiss")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-density")).toBe("compact");
    expect(document.documentElement.getAttribute("data-color-blind")).toBe("deuteranopia");
  });

  it("ignores invalid stored theme values", async () => {
    localStorageMock.store["pda-theme"] = "postmodern";

    render(
      <ThemeProvider>
        <ThemeStateProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-state")).toHaveAttribute("data-theme", "fluid");
    });

    expect(document.documentElement.classList.contains("theme-fluid")).toBe(true);
    expect(document.documentElement.classList.contains("theme-postmodern")).toBe(false);
  });

  it("ignores invalid hydrated theme values from the preferences API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        preferences: [
          { key: "theme", value: "postmodern" },
        ],
      }),
    }));

    render(
      <ThemeProvider>
        <ThemeStateProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-state")).toHaveAttribute("data-theme", "fluid");
    });

    expect(document.documentElement.classList.contains("theme-fluid")).toBe(true);
    expect(document.documentElement.classList.contains("theme-postmodern")).toBe(false);
  });

  it("hydrates valid theme and density preferences from the server", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        preferences: [
          { key: "theme", value: "swiss" },
          { key: "line_height", value: "relaxed" },
          { key: "letter_spacing", value: "tight" },
          { key: "density", value: "compact" },
        ],
      }),
    }));

    render(
      <ThemeProvider>
        <ThemeStateProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-state")).toHaveAttribute("data-theme", "swiss");
    });

    expect(document.documentElement.classList.contains("theme-swiss")).toBe(true);
    expect(document.documentElement.getAttribute("data-density")).toBe("compact");
    expect(document.documentElement.style.getPropertyValue("--line-height-base")).toBe("1.9");
    expect(document.documentElement.style.getPropertyValue("--letter-spacing-base")).toBe("-0.01em");
  });

  it("ignores invalid hydrated accessibility values from the preferences API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        preferences: [
          { key: "line_height", value: "chaotic" },
          { key: "letter_spacing", value: "wild" },
          { key: "density", value: "dense" },
          { key: "color_blind_mode", value: "unknown" },
        ],
      }),
    }));

    render(
      <ThemeProvider>
        <ThemeStateProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-state")).toHaveAttribute("data-theme", "fluid");
    });

    expect(document.documentElement.getAttribute("data-density")).toBe("normal");
    expect(document.documentElement.getAttribute("data-color-blind")).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--line-height-base")).toBe("1.6");
    expect(document.documentElement.style.getPropertyValue("--letter-spacing-base")).toBe("0");
  });

  it("applies theme state at the document level through classes, attributes, and CSS variables", async () => {
    localStorageMock.store["pda-theme"] = "skeuomorphic";
    localStorageMock.store["pda-accessibility"] = JSON.stringify({
      fontSize: "lg",
      lineHeight: "relaxed",
      letterSpacing: "tight",
      density: "relaxed",
      colorBlindMode: "tritanopia",
    });

    render(
      <ThemeProvider>
        <ThemeStateProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-state")).toHaveAttribute("data-theme", "skeuomorphic");
    });

    expect(document.documentElement.className).toContain("theme-skeuomorphic");
    expect(document.documentElement.getAttribute("data-theme")).toBe("skeuomorphic");
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe("light");
    expect(document.documentElement.getAttribute("data-theme-transition")).toBe("overlay-plus-registered-tokens");
    expect(document.documentElement.getAttribute("data-density")).toBe("relaxed");
    expect(document.documentElement.getAttribute("data-color-blind")).toBe("tritanopia");
    expect(document.documentElement.style.getPropertyValue("--font-size-base")).toBe("1.125rem");
    expect(document.documentElement.style.getPropertyValue("--line-height-base")).toBe("1.9");
    expect(document.documentElement.style.getPropertyValue("--letter-spacing-base")).toBe("-0.01em");
  });

  it("renders the transition overlay when switching themes", async () => {
    render(
      <ThemeProvider>
        <ThemeStateProbe />
        <ThemeMutationProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-state")).toHaveAttribute("data-theme", "fluid");
    });

    fireEvent.click(screen.getByRole("button", { name: "Switch Theme" }));

    await waitFor(() => {
      expect(screen.getByTestId("theme-state")).toHaveAttribute("data-theme", "swiss");
    });

    await waitFor(() => {
      expect(screen.getByTestId("theme-transition-overlay")).toBeInTheDocument();
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("swiss");
  });

  it("updates the document runtime mode attributes when dark mode changes", async () => {
    render(
      <ThemeProvider>
        <ThemeMutationProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme-mode")).toBe("light");
    });

    fireEvent.click(screen.getByRole("button", { name: "Enable Dark" }));

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme-mode")).toBe("dark");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});