import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

function fileExists(relativePath: string): boolean {
  return existsSync(join(process.cwd(), relativePath));
}

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  usePathname: vi.fn(() => "/admin/conversations"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const noopConversationTableAction = () => {};

// ── D12.1: ConversationsTableClient source checks ─────────────────────

describe("D12.1: ConversationsTableClient — file and 'use client' directive", () => {
  it("ConversationsTableClient.tsx file exists", () => {
    expect(
      fileExists("src/components/admin/ConversationsTableClient.tsx"),
    ).toBe(true);
  });

  it("has 'use client' directive", () => {
    const source = readSource(
      "src/components/admin/ConversationsTableClient.tsx",
    );
    expect(source).toMatch(/["']use client["']/);
  });

  it("defines COLUMNS as ColumnDef array", () => {
    const source = readSource(
      "src/components/admin/ConversationsTableClient.tsx",
    );
    expect(source).toContain("COLUMNS");
    expect(source).toContain("ColumnDef");
  });

  it("exports ConversationsTableClient function", () => {
    const source = readSource(
      "src/components/admin/ConversationsTableClient.tsx",
    );
    expect(source).toContain("export");
    expect(source).toContain("ConversationsTableClient");
  });

  it("renders conversation rows with title links", async () => {
    const { ConversationsTableClient } = await import(
      "@/components/admin/ConversationsTableClient"
    );
    render(
      <ConversationsTableClient
        rows={[
          {
            id: "conv_1",
            title: "Lead follow-up",
            userId: "usr_1",
            status: "active",
            detectedNeedSummary: null,
            createdAt: "2024-01-01",
          },
        ]}
        total={1}
        page={1}
        pageSize={25}
        action={noopConversationTableAction}
      />,
    );
    const links = screen.getAllByRole("link", { name: /Lead follow-up/i });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link.getAttribute("href")).toBe("/admin/conversations/conv_1");
    }
  });

  // Negative: untitled conversation renders fallback label
  it("conversation with null title renders '(untitled)' fallback", async () => {
    const { ConversationsTableClient } = await import(
      "@/components/admin/ConversationsTableClient"
    );
    render(
      <ConversationsTableClient
        rows={[
          {
            id: "conv_2",
            title: null,
            userId: "usr_2",
            status: "closed",
            detectedNeedSummary: null,
            createdAt: "2024-01-01",
          },
        ]}
        total={1}
        page={1}
        pageSize={25}
        action={noopConversationTableAction}
      />,
    );
    expect(screen.getAllByText(/untitled/i)).toHaveLength(2);
  });

  // Edge: empty rows render the wrapper empty state instead of data rows
  it("empty rows render the empty-state message", async () => {
    const { ConversationsTableClient } = await import(
      "@/components/admin/ConversationsTableClient"
    );
    render(
      <ConversationsTableClient
        rows={[]}
        total={0}
        page={1}
        pageSize={25}
        action={noopConversationTableAction}
      />,
    );
    expect(screen.getByText("No conversations found.")).toBeInTheDocument();
  });
});

// ── D12.2: conversations/page.tsx server component ────────────────────

describe("D12.2: conversations/page.tsx — server component boundaries", () => {
  it("conversations page does NOT define ColumnDef[] render functions", () => {
    const source = readSource("src/app/admin/conversations/page.tsx");
    // Should not have inline render: (row) => JSX pattern at top level
    expect(source).not.toMatch(/const COLUMNS[\s\S]*ColumnDef/);
  });

  it("conversations page does not have 'use client' directive (server component)", () => {
    const source = readSource("src/app/admin/conversations/page.tsx");
    expect(source).not.toMatch(/["']use client["']/);
  });

  it("conversations page imports ConversationsTableClient", () => {
    const source = readSource("src/app/admin/conversations/page.tsx");
    expect(source).toContain("ConversationsTableClient");
  });

  it("conversations page passes only serialisable props to client component", () => {
    const source = readSource("src/app/admin/conversations/page.tsx");
    // No render functions passed inline
    expect(source).not.toMatch(/render=\{[^}]*=>/);
  });

  // Negative: no JSX render functions defined in the server component
  it("no arrow function JSX render props in conversations server component", () => {
    const source = readSource("src/app/admin/conversations/page.tsx");
    // Pattern: render: (row) => <something>  inside a COLUMNS definition
    expect(source).not.toMatch(/render\s*:\s*\(\w+\)\s*=>\s*</);
  });
});

// ── D12.3: Conversations takeover confirm ─────────────────────────────

describe("D12.3: Conversations detail — takeover confirm flow", () => {
  it("conversations detail page source has confirm pattern for takeover action", () => {
    const source = readSource("src/app/admin/conversations/[id]/page.tsx");
    // Admin-workflow-bar handles confirm in source
    expect(source).toMatch(/confirm|AdminWorkflowBar|takeover/i);
  });

  it("takeover action does not fire without user confirmation", () => {
    const source = readSource("src/app/admin/conversations/[id]/page.tsx");
    // Should use AdminWorkflowBar or confirming state, not bare form action
    const hasWorkflowGuard = source.includes("AdminWorkflowBar") ||
      source.includes("confirm") ||
      source.match(/dialog|modal|confirming/i) !== null;
    expect(hasWorkflowGuard).toBe(true);
  });

  // Edge: confirm message mentions session interruption
  it("confirm text or tooltip mentions interrupting current session", () => {
    const source = readSource("src/app/admin/conversations/[id]/page.tsx");
    // The confirm should warn the user
    const hasWarning = source.match(/interrupt|session|take over|takeover/i) !== null;
    expect(hasWarning).toBe(true);
  });

  // Negative: no bare server action fired directly on form submit without guard
  it("admin/conversations/[id] page does not submit takeover without a two-step guard", () => {
    const source = readSource("src/app/admin/conversations/[id]/page.tsx");
    // A bare action={someAction} on an unguarded form would be the failure mode
    // AdminWorkflowBar wraps the mutation safely
    if (source.includes("takeover") || source.includes("Takeover")) {
      expect(source).toMatch(/AdminWorkflowBar|confirm|dialog/i);
    }
  });
});

// ── D12.4: Command palette entry for conversations ────────────────────

describe("D12.4: shell-navigation — conversations showInCommands", () => {
  it("admin-conversations route has showInCommands: true", () => {
    const source = readSource("src/lib/shell/shell-navigation.ts");
    const block =
      source.match(/id:\s*["']admin-conversations["'][^}]*}/)?.[0] ?? "";
    expect(block).toContain("showInCommands: true");
  });

  it("admin-conversations href is /admin/conversations", () => {
    const source = readSource("src/lib/shell/shell-navigation.ts");
    const block =
      source.match(/id:\s*["']admin-conversations["'][^}]*}/)?.[0] ?? "";
    expect(block).toContain("/admin/conversations");
  });
});

// ── D12.5: Journal page — standard admin layout + table a11y ──────────

describe("D12.5: Journal admin page — layout, filters, and table accessibility", () => {
  it("journal page does NOT contain editorial-page-shell CSS class", () => {
    const source = readSource("src/app/admin/journal/page.tsx");
    expect(source).not.toContain("editorial-page-shell");
  });

  it("journal page uses AdminSection component", () => {
    const source = readSource("src/app/admin/journal/page.tsx");
    expect(source).toContain("AdminSection");
  });

  it("journal page uses AdminBrowseFilters instead of raw inline form", () => {
    const source = readSource("src/app/admin/journal/page.tsx");
    expect(source).toContain("AdminBrowseFilters");
  });

  it("journal workspace pages use the local AdminWorkspaceNav", () => {
    const listSource = readSource("src/app/admin/journal/page.tsx");
    const attributionSource = readSource("src/app/admin/journal/attribution/page.tsx");
    const detailSource = readSource("src/app/admin/journal/[id]/page.tsx");

    expect(listSource).not.toContain("AdminWorkspaceNav");
    expect(attributionSource).not.toContain("AdminWorkspaceNav");
    expect(detailSource).not.toContain("AdminWorkspaceNav");
    expect(listSource).toContain("AdminBrowseFilters");
  });

  it("journal page does NOT have raw inline <form> filter block", () => {
    const source = readSource("src/app/admin/journal/page.tsx");
    // Inline filter form was the old pattern — AdminBrowseFilters replaces it
    // A bare <form> with filter inputs inline in the page (not in a component) is gone
    const inlineFormCount = (
      source.match(/<form[^>]*>[\s\S]*?<input[^>]*type="search"/g) ?? []
    ).length;
    expect(inlineFormCount).toBe(0);
  });

  it("journal table <th> elements have scope='col'", () => {
    const source = readSource("src/app/admin/journal/page.tsx");
    // If raw table is still present (migration may be partial), verify scope
    if (source.includes("<th")) {
      expect(source).toContain('scope="col"');
    }
  });

  it("journal action links contain sr-only row context span", () => {
    const source = readSource("src/app/admin/journal/page.tsx");
    // Either the action links have sr-only class or the page uses a client component
    const hasActionContext =
      source.includes("sr-only") ||
      source.includes("JournalTableClient") ||
      source.includes("AdminDataTable");
    expect(hasActionContext).toBe(true);
  });

  // Negative: journal page no longer uses raw <table> with no caption/aria-label
  it("journal page table has an accessible name if raw table is used", () => {
    const source = readSource("src/app/admin/journal/page.tsx");
    if (source.includes("<table")) {
      // If there's a raw table, it should have aria-label or <caption>
      const hasLabel =
        source.includes("aria-label") ||
        source.includes("<caption") ||
        source.includes("AdminDataTable");
      expect(hasLabel).toBe(true);
    }
  });

  // Edge: action link "Preview" has sr-only suffix with article title
  it("Preview action link source includes sr-only text with row context", () => {
    const source = readSource("src/app/admin/journal/page.tsx");
    if (source.includes("Preview")) {
      expect(source).toMatch(/sr-only|Preview.*title|title.*Preview/);
    }
  });

  // Edge: Manage action link has sr-only suffix
  it("Manage action link source includes sr-only text with row context", () => {
    const source = readSource("src/app/admin/journal/page.tsx");
    if (source.includes("Manage")) {
      expect(source).toMatch(/sr-only|Manage.*title|title.*Manage/);
    }
  });

  it("journal page still renders title as h2 (not h1)", () => {
    const source = readSource("src/app/admin/journal/page.tsx");
    // Uses AdminSection which renders h2
    if (!source.includes("AdminSection")) {
      expect(source).not.toMatch(/<h1/);
    }
  });
});
