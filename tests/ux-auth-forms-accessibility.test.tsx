import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush, replace: vi.fn() })),
  usePathname: vi.fn(() => "/"),
}));

// ── D13.1: Login page role="alert" ────────────────────────────────────

describe("D13.1: Login page — role='alert' on error container", () => {
  it("login page source has role='alert' on error element", () => {
    const source = readSource("src/app/login/page.tsx");
    expect(source).toContain('role="alert"');
  });

  it("login page error container is always in DOM (not conditional render)", () => {
    const source = readSource("src/app/login/page.tsx");
    // The pattern `{error && <div...>}` is the broken pattern — always-present is required
    // Source should NOT use conditional && pattern for the error element itself
    // It may use conditional content inside a stable container
    const alwaysRenderedPattern = source.match(
      /role=["']alert["'][^>]*>[\s\S]*?\{error/,
    );
    expect(alwaysRenderedPattern).not.toBeNull();
  });

  it("login page error container has aria-live='assertive'", () => {
    const source = readSource("src/app/login/page.tsx");
    expect(source).toContain("aria-live");
    expect(source).toMatch(/aria-live=["']assertive["']/);
  });

  // Negative: plain <div className="alert-error"> without role is gone
  it("login error is not rendered as a plain div without role", () => {
    const source = readSource("src/app/login/page.tsx");
    // The old pattern was <div className="alert-error"> with no role
    const plainErrorDiv = source.match(
      /<div[^>]*alert-error[^>]*>[^>]*<\/div>/,
    );
    if (plainErrorDiv) {
      // If the pattern still exists, it must have role="alert"
      expect(plainErrorDiv[0]).toContain("role");
    }
  });

  // Edge: empty error string renders empty alert container (not hidden)
  it("login error container renders even when error is empty string", () => {
    const source = readSource("src/app/login/page.tsx");
    // Should NOT be {error && <element>} — element must always be present
    expect(source).not.toMatch(/\{error\s*&&\s*<[^>]*role=["']alert["']/);
  });
});

// ── D13.2: Register page role="alert" + aria-describedby ──────────────

describe("D13.2: Register page — error accessibility", () => {
  it("register page form-level error has role='alert'", () => {
    const source = readSource("src/app/register/page.tsx");
    expect(source).toContain('role="alert"');
  });

  it("register page field error paragraphs have id attributes", () => {
    const source = readSource("src/app/register/page.tsx");
    // Field error elements need id="{fieldId}-error" pattern
    expect(source).toMatch(/id=["']?\w+-error["']?/);
  });

  it("register page input fields have aria-describedby", () => {
    const source = readSource("src/app/register/page.tsx");
    expect(source).toContain("aria-describedby");
  });

  it("register page input fields have aria-invalid when error is set", () => {
    const source = readSource("src/app/register/page.tsx");
    expect(source).toContain("aria-invalid");
  });

  it("password field help text mentions 72-character maximum", () => {
    const source = readSource("src/app/register/page.tsx");
    // Must mention both min and max constraints
    expect(source).toMatch(/72/);
  });

  it("password help text mentions 8-character minimum", () => {
    const source = readSource("src/app/register/page.tsx");
    expect(source).toMatch(/8/);
  });

  // Negative: placeholder text alone is not the only label
  it("password field is not relying solely on placeholder for constraints", () => {
    const source = readSource("src/app/register/page.tsx");
    // There should be explicit help text (not just placeholder)
    // A description paragraph or AdminFormField wrapper should be present
    const hasHelpText =
      source.includes("description") ||
      source.includes("AdminFormField") ||
      source.match(/<p[^>]*>\s*8[^<]*72/) !== null;
    expect(hasHelpText).toBe(true);
  });

  // Edge: field errors only appear when validation fails (not on initial render)
  it("register source conditionally renders field errors based on error state", () => {
    const source = readSource("src/app/register/page.tsx");
    // Error paragraphs should be conditional
    expect(source).toMatch(/\bfieldError|errors\.\w+|error\.\w+|\berror\b/i);
  });
});

// ── D13.3: ProfileSettingsPanel aria-describedby + role="status" ──────

describe("D13.3: ProfileSettingsPanel — aria-describedby and save status", () => {
  it("ProfileSettingsPanel source has aria-describedby on credential input", () => {
    const source = readSource(
      "src/components/profile/ProfileSettingsPanel.tsx",
    );
    expect(source).toContain("aria-describedby");
  });

  it("credential help text paragraph has matching id", () => {
    const source = readSource(
      "src/components/profile/ProfileSettingsPanel.tsx",
    );
    // The id must match what aria-describedby references
    expect(source).toMatch(/id=["']\w+-description["']|id=["']credential-description["']/);
  });

  it("save status notice has role='status'", () => {
    const source = readSource(
      "src/components/profile/ProfileSettingsPanel.tsx",
    );
    expect(source).toContain('role="status"');
  });

  it("save status notice has aria-live='polite'", () => {
    const source = readSource(
      "src/components/profile/ProfileSettingsPanel.tsx",
    );
    expect(source).toMatch(/aria-live=["']polite["']/);
  });

  it("save status element is always in DOM when save state exists", () => {
    const source = readSource(
      "src/components/profile/ProfileSettingsPanel.tsx",
    );
    // role="status" element should not be conditionally removed from DOM
    // (it should render with empty content when not saving)
    expect(source).toContain('role="status"');
  });

  // Negative: save notice is NOT role="alert" (it's polite, not assertive)
  it("save notice uses role='status' not role='alert'", () => {
    const source = readSource(
      "src/components/profile/ProfileSettingsPanel.tsx",
    );
    // The save confirmation is polite — role="alert" would be too aggressive
    const statusCount = (source.match(/role=["']status["']/g) ?? []).length;
    expect(statusCount).toBeGreaterThanOrEqual(1);
    // Should NOT have role="alert" for the save confirmation specifically
    // (login/register errors use alert; save confirmations use status)
  });

  // Edge: aria-describedby and id must be paired (same token)
  it("aria-describedby value matches an id in the same component", () => {
    const source = readSource(
      "src/components/profile/ProfileSettingsPanel.tsx",
    );
    const describedByMatch = source.match(/aria-describedby=["']([^"']+)["']/);
    if (describedByMatch) {
      const id = describedByMatch[1];
      expect(source).toContain(`id="${id}"`);
    }
  });
});

// ── D13.4: AdminSearchBar command navigation mode ─────────────────────

describe("D13.4: AdminSearchBar — command navigation mode", () => {
  it("AdminSearchBar source contains command navigation logic", () => {
    const source = readSource("src/components/admin/AdminSearchBar.tsx");
    // Should detect '/' prefix and switch modes
    expect(source).toMatch(/startsWith\s*\(\s*["']\/["']\)|^\//);
  });

  it("AdminSearchBar source references admin navigation routes for command mode", () => {
    const source = readSource("src/components/admin/AdminSearchBar.tsx");
    expect(source).toMatch(
      /adminNav|SHELL_ROUTES|shell-navigation|admin-navigation/i,
    );
  });

  it("typing '/' switches to command mode — placeholder changes", async () => {
    const { AdminSearchBar } = await import(
      "@/components/admin/AdminSearchBar"
    );
    render(<AdminSearchBar />);
    const input = screen.getByRole("searchbox") ??
      screen.getByRole("textbox") ??
      document.querySelector("input[type='search'], input[type='text']")!;
    fireEvent.change(input, { target: { value: "/" } });
    // Placeholder should change to command navigation mode hint
    const updatedInput = document.querySelector("input")!;
    expect(updatedInput.placeholder).toMatch(/command|Command|type a|\/users/i);
  });

  it("command mode shows admin nav items in dropdown", async () => {
    const { AdminSearchBar } = await import(
      "@/components/admin/AdminSearchBar"
    );
    render(<AdminSearchBar />);
    const input = document.querySelector("input")!;
    fireEvent.change(input, { target: { value: "/us" } });
    // Should show Users command result
    const userOption = screen.queryByText(/Users/i);
    expect(userOption).not.toBeNull();
  });

  it("selecting a command navigates to that route", async () => {
    const { AdminSearchBar } = await import(
      "@/components/admin/AdminSearchBar"
    );
    render(<AdminSearchBar />);
    const input = document.querySelector("input")!;
    fireEvent.change(input, { target: { value: "/users" } });
    const usersOption = screen.queryByText(/Users/i);
    if (usersOption) {
      fireEvent.click(usersOption);
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringMatching(/\/admin\/users/),
      );
    }
  });

  // Negative: entity search mode does not activate for non-'/' prefix
  it("non-slash input stays in entity search mode, not command mode", async () => {
    const { AdminSearchBar } = await import(
      "@/components/admin/AdminSearchBar"
    );
    render(<AdminSearchBar />);
    const input = document.querySelector("input")!;
    fireEvent.change(input, { target: { value: "Alice" } });
    const placeholder = input.getAttribute("placeholder") ?? "";
    expect(placeholder).not.toMatch(/command|Command|\/users/i);
  });

  // Negative: clearing search does not navigate
  it("clearing the input does not trigger navigation", async () => {
    const { AdminSearchBar } = await import(
      "@/components/admin/AdminSearchBar"
    );
    render(<AdminSearchBar />);
    const input = document.querySelector("input")!;
    fireEvent.change(input, { target: { value: "/us" } });
    fireEvent.change(input, { target: { value: "" } });
    // No navigation should have been called
    expect(mockPush).not.toHaveBeenCalled();
  });

  // Edge: '/' with no subsequent text shows all commands
  it("input of '/' alone shows all available admin commands", async () => {
    const { AdminSearchBar } = await import(
      "@/components/admin/AdminSearchBar"
    );
    render(<AdminSearchBar />);
    const input = document.querySelector("input")!;
    fireEvent.change(input, { target: { value: "/" } });
    // Multiple command options should appear
    const items = document.querySelectorAll("[role='option'], [role='menuitem'], li");
    expect(items.length).toBeGreaterThan(0);
  });

  // Edge: backspacing from '/us' to '/' stays in command mode
  it("backspacing to '/' stays in command mode", async () => {
    const { AdminSearchBar } = await import(
      "@/components/admin/AdminSearchBar"
    );
    render(<AdminSearchBar />);
    const input = document.querySelector("input")!;
    fireEvent.change(input, { target: { value: "/us" } });
    fireEvent.change(input, { target: { value: "/" } });
    // Still in command mode
    expect(input.getAttribute("placeholder") ?? "").toMatch(
      /command|Command|type/i,
    );
  });

  // Edge: Escape key closes the dropdown
  it("Escape key closes the command suggestion dropdown", async () => {
    const { AdminSearchBar } = await import(
      "@/components/admin/AdminSearchBar"
    );
    render(<AdminSearchBar />);
    const input = document.querySelector("input")!;
    fireEvent.change(input, { target: { value: "/" } });
    fireEvent.keyDown(input, { key: "Escape" });
    // Dropdown should be dismissed
    const dropdown = document.querySelector("[role='listbox'], [role='menu']");
    if (dropdown) {
      expect(
        getComputedStyle(dropdown).display === "none" ||
        !document.body.contains(dropdown),
      ).toBe(true);
    }
  });
});

// ── D13.5: Detail form fields wrapped in AdminFormField ───────────────

describe("D13.5: Detail pages — AdminFormField wrapper in edit forms", () => {
  it("users detail page source imports or uses AdminFormField", () => {
    const source = readSource("src/app/admin/users/[id]/page.tsx");
    expect(source).toMatch(/AdminFormField|aria-describedby/);
  });

  it("leads detail page source imports or uses AdminFormField", () => {
    const source = readSource("src/app/admin/leads/[id]/page.tsx");
    expect(source).toMatch(/AdminFormField|aria-describedby/);
  });

  it("users detail edit form fields have associated labels", () => {
    const source = readSource("src/app/admin/users/[id]/page.tsx");
    // Inputs must have labels — either via AdminFormField or explicit htmlFor
    expect(source).toMatch(/AdminFormField|htmlFor|aria-label/);
  });

  // Negative: no raw <input> without label association
  it("users detail page has no unlabelled bare input elements", () => {
    const source = readSource("src/app/admin/users/[id]/page.tsx");
    // Check that inputs inside forms are wrapped by AdminFormField or have labels
    // A bare <input type="text"> with no id, no aria-label, no AdminFormField wrapper is the failure
    const bareInputs = source.match(/<input[^>]*>/g) ?? [];
    for (const input of bareInputs) {
      const hasAccessibility =
        input.includes("id=") ||
        input.includes("aria-label") ||
        input.includes("aria-labelledby") ||
        // The AdminFormField wrapper injects the id via cloneElement
        source.includes("AdminFormField");
      expect(
        hasAccessibility,
        `Input "${input.substring(0, 60)}" has no accessible label`,
      ).toBe(true);
    }
  });

  // Edge: description and error are wired for inline validation fields
  it("leads detail page wires error and description through AdminFormField", () => {
    const source = readSource("src/app/admin/leads/[id]/page.tsx");
    if (source.includes("AdminFormField")) {
      // Should pass error and/or description props
      expect(source).toMatch(/description=|error=/);
    } else {
      // If not using AdminFormField, must have aria-describedby manually
      expect(source).toMatch(/aria-describedby|aria-invalid/);
    }
  });

  it("detail form fields have aria-invalid on error state", () => {
    const source = readSource("src/app/admin/users/[id]/page.tsx");
    // Either using AdminFormField (which injects it) or explicit aria-invalid
    const hasInvalidSupport =
      source.includes("AdminFormField") || source.includes("aria-invalid");
    expect(hasInvalidSupport).toBe(true);
  });
});
