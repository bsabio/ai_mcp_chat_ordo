import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { THEME_SELECTOR_OPTIONS } from "@/lib/theme/theme-manifest";

import { ThemeSwitcher } from "./ThemeSwitcher";

const useThemeMock = vi.fn();

vi.mock("./ThemeProvider", () => ({
  useTheme: () => useThemeMock(),
}));

describe("ThemeSwitcher", () => {
  it("renders the current runtime-supported theme labels", () => {
    useThemeMock.mockReturnValue({
      theme: "fluid",
      setTheme: vi.fn(),
    });

    render(<ThemeSwitcher />);

    expect(screen.getAllByRole("button")).toHaveLength(THEME_SELECTOR_OPTIONS.length);

    for (const option of THEME_SELECTOR_OPTIONS) {
      expect(screen.getByRole("button", { name: option.label })).toBeInTheDocument();
    }
  });

  it("dispatches the selected supported theme id", () => {
    const setTheme = vi.fn();
    useThemeMock.mockReturnValue({
      theme: "fluid",
      setTheme,
    });

    render(<ThemeSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "Swiss Grid (1950s)" }));

    expect(setTheme).toHaveBeenCalledWith("swiss");
  });

  it("marks the active manifest-backed theme option with the active surface class", () => {
    useThemeMock.mockReturnValue({
      theme: "bauhaus",
      setTheme: vi.fn(),
    });

    render(<ThemeSwitcher />);

    expect(screen.getByRole("button", { name: "Bauhaus (1919)" }).className).toContain("accent-interactive-fill");
    expect(screen.getByRole("button", { name: "Swiss Grid (1950s)" }).className).toContain("hover-surface");
  });
});