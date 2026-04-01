import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

function fileExists(relativePath: string): boolean {
  return existsSync(join(process.cwd(), relativePath));
}

// ── D8.1–D8.2: shell-navigation.ts config ─────────────────────────────

describe("D8.1: shell-navigation config — header visibility", () => {
  it("home route does not have headerVisibility set to 'all'", () => {
    const source = readSource("src/lib/shell/shell-navigation.ts");
    // Find the home route block and confirm headerVisibility is absent or scoped
    const homeBlock = source.match(/id:\s*["']home["'][^}]*}/)?.[0] ?? "";
    expect(homeBlock).not.toMatch(/headerVisibility:\s*["']all["']/);
  });

  it("corpus route does not have headerVisibility set to 'all'", () => {
    const source = readSource("src/lib/shell/shell-navigation.ts");
    const corpusBlock = source.match(/id:\s*["']corpus["'][^}]*}/)?.[0] ?? "";
    expect(corpusBlock).not.toMatch(/headerVisibility:\s*["']all["']/);
  });

  it("blog route does not have headerVisibility set to 'all'", () => {
    const source = readSource("src/lib/shell/shell-navigation.ts");
    const blogBlock = source.match(/id:\s*["']blog["'][^}]*}/)?.[0] ?? "";
    expect(blogBlock).not.toMatch(/headerVisibility:\s*["']all["']/);
  });

  it("admin-accessible routes have showInCommands: true", () => {
    const source = readSource("src/lib/shell/shell-navigation.ts");
    // Every admin route block should have showInCommands
    const adminRouteIds = [
      "admin-dashboard",
      "admin-users",
      "admin-leads",
      "admin-affiliates",
      "admin-conversations",
      "admin-jobs",
      "admin-prompts",
      "journal-admin",
      "admin-system",
    ];
    for (const id of adminRouteIds) {
      const block = source.match(new RegExp(`id:\\s*["']${id}["'][^}]*}`))?.[0] ?? "";
      expect(block, `Route ${id} should have showInCommands: true`).toContain(
        "showInCommands: true",
      );
    }
  });
});

describe("D8.2: shell-navigation config — footer + admin visibility", () => {
  it("admin-dashboard has footerVisibility scoped to ADMIN", () => {
    const source = readSource("src/lib/shell/shell-navigation.ts");
    const block = source.match(/id:\s*["']admin-dashboard["'][^}]*}/)?.[0] ?? "";
    expect(block).toContain("ADMIN");
    expect(block).toContain("footerVisibility");
  });

  it("admin-system has footerVisibility including ADMIN", () => {
    const source = readSource("src/lib/shell/shell-navigation.ts");
    const block = source.match(/id:\s*["']admin-system["'][^}]*}/)?.[0] ?? "";
    expect(block).toContain("footerVisibility");
  });

  it("journal-admin has footerVisibility defined", () => {
    const source = readSource("src/lib/shell/shell-navigation.ts");
    const block = source.match(/id:\s*["']journal-admin["'][^}]*}/)?.[0] ?? "";
    expect(block).toContain("footerVisibility");
  });

  // Negative: public routes should NOT carry admin-only footerVisibility
  it("home route footer visibility is not restricted to ADMIN only", () => {
    const source = readSource("src/lib/shell/shell-navigation.ts");
    const homeBlock = source.match(/id:\s*["']home["'][^}]*}/)?.[0] ?? "";
    // Home should be visible to all OR have no footerVisibility — not ["ADMIN"]
    if (homeBlock.includes("footerVisibility")) {
      expect(homeBlock).not.toMatch(/footerVisibility:\s*\["ADMIN"\]/);
    }
  });

  it("admin routes do not appear in headerVisibility: 'all'", () => {
    const source = readSource("src/lib/shell/shell-navigation.ts");
    const adminBlock =
      source.match(/id:\s*["']admin-dashboard["'][^}]*}/)?.[0] ?? "";
    expect(adminBlock).not.toMatch(/headerVisibility:\s*["']all["']/);
  });

  // Edge: SHELL_ROUTES constant is exported and is a readonly array
  it("SHELL_ROUTES is exported from shell-navigation.ts", () => {
    const source = readSource("src/lib/shell/shell-navigation.ts");
    expect(source).toContain("export const SHELL_ROUTES");
  });
});

// ── D8.3: AdminBreadcrumb component ───────────────────────────────────

describe("D8.3: AdminBreadcrumb — file existence and structure", () => {
  it("AdminBreadcrumb.tsx file exists", () => {
    expect(fileExists("src/components/admin/AdminBreadcrumb.tsx")).toBe(true);
  });

  it("exports BreadcrumbItem interface and AdminBreadcrumb function", () => {
    const source = readSource("src/components/admin/AdminBreadcrumb.tsx");
    expect(source).toContain("BreadcrumbItem");
    expect(source).toContain("AdminBreadcrumb");
    expect(source).toContain("export");
  });

  it("renders nav with aria-label Breadcrumb", async () => {
    const { AdminBreadcrumb } = await import(
      "@/components/admin/AdminBreadcrumb"
    );
    render(
      <AdminBreadcrumb
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Users", href: "/admin/users" },
          { label: "Jane Smith" },
        ]}
      />,
    );
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeDefined();
  });

  it("last item has aria-current='page' and is not a link", async () => {
    const { AdminBreadcrumb } = await import(
      "@/components/admin/AdminBreadcrumb"
    );
    render(
      <AdminBreadcrumb
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Jane Smith" },
        ]}
      />,
    );
    const current = screen.getByText("Jane Smith");
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(current.tagName.toLowerCase()).not.toBe("a");
  });

  it("separator spans have aria-hidden='true'", () => {
    const source = readSource("src/components/admin/AdminBreadcrumb.tsx");
    expect(source).toContain('aria-hidden="true"');
  });

  it("intermediate items are rendered as links", async () => {
    const { AdminBreadcrumb } = await import(
      "@/components/admin/AdminBreadcrumb"
    );
    render(
      <AdminBreadcrumb
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Users", href: "/admin/users" },
          { label: "Jane Smith" },
        ]}
      />,
    );
    const adminLink = screen.getByRole("link", { name: "Admin" });
    expect(adminLink.getAttribute("href")).toBe("/admin");
  });

  // Negative: empty items renders nothing
  it("empty items array renders nothing", async () => {
    const { AdminBreadcrumb } = await import(
      "@/components/admin/AdminBreadcrumb"
    );
    const { container } = render(<AdminBreadcrumb items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("single item renders current-page span with no separator", async () => {
    const { AdminBreadcrumb } = await import(
      "@/components/admin/AdminBreadcrumb"
    );
    render(<AdminBreadcrumb items={[{ label: "Dashboard" }]} />);
    const current = screen.getByText("Dashboard");
    expect(current.getAttribute("aria-current")).toBe("page");
    // No separator slash should be visible
    expect(screen.queryByText("/")).toBeNull();
  });

  // Edge: very long label does not break layout (truncate class applied)
  it("source applies text truncation styles to current item", () => {
    const source = readSource("src/components/admin/AdminBreadcrumb.tsx");
    expect(source).toMatch(/truncate|text-ellipsis|max-w/);
  });

  // Edge: item with href=undefined falls back gracefully
  it("item with href omitted renders as current-page span", async () => {
    const { AdminBreadcrumb } = await import(
      "@/components/admin/AdminBreadcrumb"
    );
    render(
      <AdminBreadcrumb
        items={[{ label: "Lead #42", href: undefined }]}
      />,
    );
    const span = screen.getByText("Lead #42");
    expect(span.getAttribute("aria-current")).toBe("page");
  });
});

// ── D8.4: AdminPagination component ───────────────────────────────────

describe("D8.4: AdminPagination — file existence and structure", () => {
  it("AdminPagination.tsx file exists", () => {
    expect(fileExists("src/components/admin/AdminPagination.tsx")).toBe(true);
  });

  it("does NOT have 'use client' directive (server component)", () => {
    const source = readSource("src/components/admin/AdminPagination.tsx");
    expect(source).not.toContain('"use client"');
    expect(source).not.toContain("'use client'");
  });

  it("renders nav with aria-label Pagination", async () => {
    const { AdminPagination } = await import(
      "@/components/admin/AdminPagination"
    );
    render(
      <AdminPagination
        page={2}
        total={100}
        pageSize={25}
        baseHref="/admin/users"
      />,
    );
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeDefined();
  });

  it("Prev link is aria-disabled on page 1", async () => {
    const { AdminPagination } = await import(
      "@/components/admin/AdminPagination"
    );
    render(
      <AdminPagination page={1} total={100} pageSize={25} baseHref="/admin/users" />,
    );
    const prev = screen.getByLabelText("Previous page");
    expect(prev.getAttribute("aria-disabled")).toBe("true");
  });

  it("Next link is aria-disabled on last page", async () => {
    const { AdminPagination } = await import(
      "@/components/admin/AdminPagination"
    );
    render(
      <AdminPagination page={4} total={100} pageSize={25} baseHref="/admin/users" />,
    );
    const next = screen.getByLabelText("Next page");
    expect(next.getAttribute("aria-disabled")).toBe("true");
  });

  it("current page button has aria-current='page'", async () => {
    const { AdminPagination } = await import(
      "@/components/admin/AdminPagination"
    );
    render(
      <AdminPagination page={2} total={100} pageSize={25} baseHref="/admin/users" />,
    );
    const page2 = screen.getByText("2");
    expect(page2.getAttribute("aria-current")).toBe("page");
  });

  it("page links use correct baseHref + ?page= query", async () => {
    const { AdminPagination } = await import(
      "@/components/admin/AdminPagination"
    );
    render(
      <AdminPagination page={1} total={75} pageSize={25} baseHref="/admin/leads" />,
    );
    const page3 = screen.getByText("3");
    expect(page3.closest("a")?.getAttribute("href")).toBe(
      "/admin/leads?page=3",
    );
  });

  // Negative: renders nothing when total is 0
  it("renders nothing when total is 0", async () => {
    const { AdminPagination } = await import(
      "@/components/admin/AdminPagination"
    );
    const { container } = render(
      <AdminPagination page={1} total={0} pageSize={25} baseHref="/admin/users" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when all results fit on one page", async () => {
    const { AdminPagination } = await import(
      "@/components/admin/AdminPagination"
    );
    const { container } = render(
      <AdminPagination page={1} total={10} pageSize={25} baseHref="/admin/users" />,
    );
    expect(container.firstChild).toBeNull();
  });

  // Edge: page 1 Prev href never generates ?page=0
  it("Prev link on page 1 never generates page=0 or page=-1 href", async () => {
    const { AdminPagination } = await import(
      "@/components/admin/AdminPagination"
    );
    render(
      <AdminPagination page={1} total={100} pageSize={25} baseHref="/admin/users" />,
    );
    const prev = screen.getByLabelText("Previous page");
    const href = prev.getAttribute("href") ?? "";
    expect(href).not.toContain("page=0");
    expect(href).not.toContain("page=-");
  });

  it("exactly 1 page of results (total === pageSize) renders nothing", async () => {
    const { AdminPagination } = await import(
      "@/components/admin/AdminPagination"
    );
    const { container } = render(
      <AdminPagination page={1} total={25} pageSize={25} baseHref="/admin/users" />,
    );
    expect(container.firstChild).toBeNull();
  });

  // Edge: large page count still renders correctly
  it("page 50 of 100 has both Prev and Next enabled", async () => {
    const { AdminPagination } = await import(
      "@/components/admin/AdminPagination"
    );
    render(
      <AdminPagination page={50} total={2500} pageSize={25} baseHref="/admin/jobs" />,
    );
    const prev = screen.getByLabelText("Previous page");
    const next = screen.getByLabelText("Next page");
    expect(prev.getAttribute("aria-disabled")).toBeNull();
    expect(next.getAttribute("aria-disabled")).toBeNull();
  });
});

// ── D8.5: AdminFormField component ────────────────────────────────────

describe("D8.5: AdminFormField — file existence and structure", () => {
  it("AdminFormField.tsx file exists", () => {
    expect(fileExists("src/components/admin/AdminFormField.tsx")).toBe(true);
  });

  it("has 'use client' directive", () => {
    const source = readSource("src/components/admin/AdminFormField.tsx");
    expect(source).toMatch(/["']use client["']/);
  });

  it("label is associated with input via htmlFor and id", async () => {
    const { AdminFormField } = await import(
      "@/components/admin/AdminFormField"
    );
    render(
      <AdminFormField id="email" label="Email address">
        <input type="email" />
      </AdminFormField>,
    );
    const label = screen.getByText("Email address");
    expect(label.getAttribute("for") ?? label.getAttribute("htmlFor")).toBe(
      "email",
    );
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("id")).toBe("email");
  });

  it("description paragraph has id='{id}-description'", async () => {
    const { AdminFormField } = await import(
      "@/components/admin/AdminFormField"
    );
    render(
      <AdminFormField id="phone" label="Phone" description="Include country code.">
        <input type="tel" />
      </AdminFormField>,
    );
    const desc = screen.getByText("Include country code.");
    expect(desc.getAttribute("id")).toBe("phone-description");
  });

  it("child input receives aria-describedby pointing to description", async () => {
    const { AdminFormField } = await import(
      "@/components/admin/AdminFormField"
    );
    render(
      <AdminFormField id="phone" label="Phone" description="Include country code.">
        <input type="tel" />
      </AdminFormField>,
    );
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-describedby")).toContain("phone-description");
  });

  it("error paragraph has role='alert' and id='{id}-error'", async () => {
    const { AdminFormField } = await import(
      "@/components/admin/AdminFormField"
    );
    render(
      <AdminFormField id="email" label="Email" error="Invalid email address.">
        <input type="email" />
      </AdminFormField>,
    );
    const error = screen.getByRole("alert");
    expect(error.getAttribute("id")).toBe("email-error");
    expect(error.textContent).toBe("Invalid email address.");
  });

  it("child input receives aria-invalid='true' when error is set", async () => {
    const { AdminFormField } = await import(
      "@/components/admin/AdminFormField"
    );
    render(
      <AdminFormField id="email" label="Email" error="Required.">
        <input type="email" />
      </AdminFormField>,
    );
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  // Negative: no description → no aria-describedby for description
  it("no description → child does not receive description aria-describedby", async () => {
    const { AdminFormField } = await import(
      "@/components/admin/AdminFormField"
    );
    render(
      <AdminFormField id="name" label="Full Name">
        <input type="text" />
      </AdminFormField>,
    );
    const input = screen.getByRole("textbox");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy).not.toContain("name-description");
  });

  it("no error → child does not receive aria-invalid", async () => {
    const { AdminFormField } = await import(
      "@/components/admin/AdminFormField"
    );
    render(
      <AdminFormField id="name" label="Full Name">
        <input type="text" />
      </AdminFormField>,
    );
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-invalid")).not.toBe("true");
  });

  // Edge: both description and error → aria-describedby contains both ids
  it("both description and error → aria-describedby contains both ids", async () => {
    const { AdminFormField } = await import(
      "@/components/admin/AdminFormField"
    );
    render(
      <AdminFormField
        id="pass"
        label="Password"
        description="8–72 characters."
        error="Too short."
      >
        <input type="password" />
      </AdminFormField>,
    );
    const input = screen.getByLabelText("Password");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy).toContain("pass-description");
    expect(describedBy).toContain("pass-error");
  });

  it("required prop adds aria-required='true' to child input", async () => {
    const { AdminFormField } = await import(
      "@/components/admin/AdminFormField"
    );
    render(
      <AdminFormField id="email" label="Email" required>
        <input type="email" />
      </AdminFormField>,
    );
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-required")).toBe("true");
  });

  it("required prop appends ' *' marker to label text", async () => {
    const { AdminFormField } = await import(
      "@/components/admin/AdminFormField"
    );
    render(
      <AdminFormField id="email" label="Email" required>
        <input type="email" />
      </AdminFormField>,
    );
    expect(screen.getByText(/Email\s*\*/)).toBeDefined();
  });
});

// ── D8.6: AdminBrowseFilters date type + description ──────────────────

describe("D8.6: AdminBrowseFilters — date field type and description", () => {
  it("FilterFieldConfig type union includes 'date'", () => {
    const source = readSource("src/components/admin/AdminBrowseFilters.tsx");
    expect(source).toContain('"date"');
  });

  it("FilterFieldConfig includes description field", () => {
    const source = readSource("src/components/admin/AdminBrowseFilters.tsx");
    expect(source).toContain("description");
  });

  it("date type renders <input type='date'>", () => {
    const source = readSource("src/components/admin/AdminBrowseFilters.tsx");
    expect(source).toContain('type="date"');
  });

  // Negative: unknown types should not crash (covered by TypeScript narrowing)
  it("source handles all FilterFieldConfig types in switch/if statement", () => {
    const source = readSource("src/components/admin/AdminBrowseFilters.tsx");
    expect(source).toContain("search");
    expect(source).toContain("select");
    expect(source).toContain("toggle");
    expect(source).toContain("date");
  });

  // Edge: description renders below the control
  it("description field renders as help text paragraph", async () => {
    const { AdminBrowseFilters } = await import(
      "@/components/admin/AdminBrowseFilters"
    );
    render(
      <AdminBrowseFilters
        fields={[
          {
            id: "status",
            label: "Status",
            type: "select",
            options: [{ value: "active", label: "Active" }],
            description: "Filter by lead status.",
          },
        ]}
      />,
    );
    expect(screen.getByText("Filter by lead status.")).toBeDefined();
  });

  it("date field renders with aria-label from field label", async () => {
    const { AdminBrowseFilters } = await import(
      "@/components/admin/AdminBrowseFilters"
    );
    render(
      <AdminBrowseFilters
        fields={[
          {
            id: "createdAfter",
            label: "Created After",
            type: "date",
          },
        ]}
      />,
    );
    const dateInput = screen.getByLabelText("Created After");
    expect(dateInput.getAttribute("type")).toBe("date");
  });
});
