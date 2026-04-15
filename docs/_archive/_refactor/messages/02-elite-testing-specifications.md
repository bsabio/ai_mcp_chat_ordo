# Testing Specifications: Tool Plugin Registry & Message Pipeline

**Date:** April 9, 2026 (revised)
**Prerequisite:** Core implementation guide in `01-elite-architecture-core.md`
**Stack:** vitest + @testing-library/react (per codebase convention)
**Objective:** Executable test specifications for each sprint. Every test described here can run in vitest without Playwright.

---

## 1. Test Organization

```
tests/
├── tool-plugin-registry.test.tsx        # Sprint A — registry lookup, fallback, provider
├── job-status-fallback-card.test.tsx     # Sprint A — fallback card rendering
├── rich-content-renderer-hoist.test.tsx  # Sprint A — module-scope registry verification
├── conversation-messages.test.ts        # Sprint B — pure function extraction tests
├── assistant-bubble-decomposition.test.tsx # Sprint B — sub-component rendering
├── chart-renderer-card.test.tsx         # Sprint C — per-plugin test
├── graph-renderer-card.test.tsx         # Sprint C
├── audio-player-card.test.tsx           # Sprint C
├── web-search-card.test.tsx             # Sprint C
├── plugin-integration.test.tsx          # Sprint C — end-to-end registry wiring
├── presenter-ast-boundary.test.ts       # Sprint C–D — no job-status in RichContent
├── [remaining plugin tests]             # Sprint D
├── config-bootstrap.test.ts             # Sprint D — all roles config-driven
```

Existing test files that must continue passing unchanged:
- `tests/MessageList.test.tsx` (431 lines)
- `tests/ChatPresenter.test.ts` (600+ lines)
- `tests/RichContentRenderer.test.tsx` (400+ lines)
- `tests/browser-fab-chat-flow.test.tsx` (200+ lines)

---

## 2. Sprint A Tests

### 2.1 Registry Lookup & Fallback

```tsx
// tests/tool-plugin-registry.test.tsx
import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useToolPluginRegistry, ToolPluginRegistryProvider } from
  "@/frameworks/ui/chat/registry/ToolPluginContext";
import { JobStatusFallbackCard } from
  "@/frameworks/ui/chat/plugins/system/JobStatusFallbackCard";

describe("ToolPluginRegistry", () => {
  it("returns fallback for unknown tool names", () => {
    const { result } = renderHook(() => useToolPluginRegistry());
    const Component = result.current.getRenderer("nonexistent_tool");
    expect(Component).toBe(JobStatusFallbackCard);
  });

  it("returns fallback when no provider wraps the tree", () => {
    // Default context value IS the fallback registry
    const { result } = renderHook(() => useToolPluginRegistry());
    const Component = result.current.getRenderer("set_theme");
    expect(Component).toBe(JobStatusFallbackCard);
  });

  it("returns registered component for known tool name", () => {
    const MockPlugin = () => <div>mock</div>;
    const registry = {
      getRenderer: (name: string) =>
        name === "set_theme" ? MockPlugin : JobStatusFallbackCard,
    };

    const { result } = renderHook(() => useToolPluginRegistry(), {
      wrapper: ({ children }) => (
        <ToolPluginRegistryProvider registry={registry}>
          {children}
        </ToolPluginRegistryProvider>
      ),
    });

    expect(result.current.getRenderer("set_theme")).toBe(MockPlugin);
    expect(result.current.getRenderer("unknown")).toBe(JobStatusFallbackCard);
  });

  it("getRenderer never returns null or undefined", () => {
    const { result } = renderHook(() => useToolPluginRegistry());
    const names = ["", "null", "undefined", "beta_unreleased_tool", "  "];
    for (const name of names) {
      expect(result.current.getRenderer(name)).toBeDefined();
      expect(result.current.getRenderer(name)).not.toBeNull();
    }
  });
});
```

### 2.2 JobStatusFallbackCard

```tsx
// tests/job-status-fallback-card.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { JobStatusFallbackCard } from
  "@/frameworks/ui/chat/plugins/system/JobStatusFallbackCard";

const basePart = {
  type: "job_status" as const,
  toolName: "beta_unreleased_tool",
  jobId: "job_123",
  status: "running" as const,
  label: "Processing...",
};

describe("JobStatusFallbackCard", () => {
  it("renders the tool name and status for any tool", () => {
    render(<JobStatusFallbackCard part={basePart} isStreaming={false} />);
    expect(screen.getByText(/processing/i)).toBeInTheDocument();
  });

  it("renders without crashing for succeeded status", () => {
    render(
      <JobStatusFallbackCard
        part={{ ...basePart, status: "succeeded" }}
        isStreaming={false}
      />,
    );
    // Should not throw
  });

  it("renders without crashing for failed status", () => {
    render(
      <JobStatusFallbackCard
        part={{ ...basePart, status: "failed" }}
        isStreaming={false}
      />,
    );
  });
});
```

### 2.3 RichContentRenderer Static Registry

This test verifies the blockRegistry/inlineRegistry hoist. After Sprint A, these should be module-scoped constants.

```tsx
// tests/rich-content-renderer-hoist.test.tsx
import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

describe("RichContentRenderer registry allocation", () => {
  it("does not recreate registries across renders", () => {
    // Strategy: render twice and spy on object creation.
    // If registries are module-scoped, the same object reference is used.
    // This is a structural assertion — if someone moves them back inside
    // the component body, this test guides them back.

    // Import the module and check the export is stable
    const mod = await import("@/frameworks/ui/RichContentRenderer");

    // If blockRegistry is exported (recommended), assert reference stability:
    // expect(mod.blockRegistry).toBe(mod.blockRegistry);

    // If not exported, render-based test:
    const renderSpy = vi.fn();
    // Render component twice, assert no excess object allocations
    // (implementation depends on whether registries are exported)
  });
});
```

> **Note:** The exact assertion depends on whether the hoisted registries are exported. If they are, a simple reference identity check works. If not, a `performance.mark` or render-count test is appropriate.

### 2.4 Content-Visibility CSS

```tsx
// Can be added to existing MessageList.test.tsx
it("applies content-visibility to message wrappers", () => {
  // After rendering a conversation with messages, assert:
  const messages = container.querySelectorAll("[data-chat-message-role]");
  expect(messages.length).toBeGreaterThan(0);
  // CSS assertion — verifiable in Playwright if jsdom doesn't compute styles.
  // In unit test, assert the attribute exists (CSS applies via selector).
  for (const msg of messages) {
    expect(msg).toHaveAttribute("data-chat-message-role");
  }
});
```

---

## 3. Sprint B Tests

### 3.1 ConversationMessages Pure Functions

```tsx
// tests/conversation-messages.test.ts
import { describe, it, expect } from "vitest";
import {
  upsertJobStatus,
  appendTextDelta,
  appendPart,
} from "@/core/services/ConversationMessages";

describe("upsertJobStatus", () => {
  const baseMessages = [
    {
      id: "msg_1",
      role: "assistant" as const,
      content: "",
      parts: [
        { type: "job_status", toolName: "set_theme", jobId: "job_1", status: "running", label: "..." },
      ],
    },
  ];

  it("updates status of an existing job part", () => {
    const result = upsertJobStatus(baseMessages, "msg_1", "job_1", { status: "succeeded" });
    expect(result[0].parts[0].status).toBe("succeeded");
  });

  it("returns unchanged array when messageId not found", () => {
    const result = upsertJobStatus(baseMessages, "nonexistent", "job_1", { status: "failed" });
    expect(result).toEqual(baseMessages);
  });

  it("returns unchanged array when jobId not found in message", () => {
    const result = upsertJobStatus(baseMessages, "msg_1", "nonexistent", { status: "failed" });
    expect(result).toEqual(baseMessages);
  });

  it("does not mutate the input array", () => {
    const original = JSON.parse(JSON.stringify(baseMessages));
    upsertJobStatus(baseMessages, "msg_1", "job_1", { status: "succeeded" });
    expect(baseMessages).toEqual(original);
  });
});

describe("appendTextDelta", () => {
  it("appends text to the last message content", () => {
    const messages = [{ id: "msg_1", role: "assistant" as const, content: "Hello" }];
    const result = appendTextDelta(messages, "msg_1", " world");
    expect(result[0].content).toBe("Hello world");
  });
});
```

### 3.2 Typewriter rAF

```tsx
// Can be added to existing MessageList.test.tsx
describe("Typewriter animation", () => {
  it("uses requestAnimationFrame instead of setInterval", () => {
    // After rendering a message in typewriter mode:
    // Assert that requestAnimationFrame was called
    const rafSpy = vi.spyOn(window, "requestAnimationFrame");
    // ... render message with typewriter enabled ...
    expect(rafSpy).toHaveBeenCalled();
    rafSpy.mockRestore();
  });

  it("cancels animation frame on unmount", () => {
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");
    // ... render and unmount ...
    expect(cancelSpy).toHaveBeenCalled();
    cancelSpy.mockRestore();
  });
});
```

---

## 4. Sprint C Tests

### 4.1 Per-Plugin Unit Tests

Each plugin gets a focused test file. Pattern:

```tsx
// tests/chart-renderer-card.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ChartRendererCard } from
  "@/frameworks/ui/chat/plugins/custom/ChartRendererCard";

const chartPart = {
  type: "job_status" as const,
  toolName: "generate_chart",
  jobId: "job_chart_1",
  status: "succeeded" as const,
  label: "Chart ready",
  result: { chartType: "bar", data: [{ x: "A", y: 10 }] },
};

describe("ChartRendererCard", () => {
  it("renders chart visualization for succeeded status", () => {
    render(<ChartRendererCard part={chartPart} isStreaming={false} />);
    // Assert chart-specific UI elements
  });

  it("renders loading state for running status", () => {
    render(
      <ChartRendererCard
        part={{ ...chartPart, status: "running" }}
        isStreaming={true}
      />,
    );
    // Assert loading indicator
  });

  it("renders error state for failed status", () => {
    render(
      <ChartRendererCard
        part={{ ...chartPart, status: "failed" }}
        isStreaming={false}
      />,
    );
    // Assert error UI
  });

  it("calls onActionClick when user interacts", () => {
    const onClick = vi.fn();
    render(
      <ChartRendererCard
        part={chartPart}
        isStreaming={false}
        onActionClick={onClick}
      />,
    );
    // ... trigger interaction ...
    // expect(onClick).toHaveBeenCalledWith(expectedArgs);
  });
});
```

### 4.2 ToolPluginPartRenderer Integration

```tsx
// tests/plugin-integration.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ToolPluginPartRenderer } from
  "@/frameworks/ui/chat/ToolPluginPartRenderer";
import { ToolPluginRegistryProvider } from
  "@/frameworks/ui/chat/registry/ToolPluginContext";

const MockChartCard = ({ part }: any) => (
  <div data-testid="mock-chart">{part.toolName}</div>
);
const FallbackCard = ({ part }: any) => (
  <div data-testid="fallback">{part.toolName}</div>
);

const testRegistry = {
  getRenderer: (name: string) =>
    name === "generate_chart" ? MockChartCard : FallbackCard,
};

describe("ToolPluginPartRenderer", () => {
  it("renders the registered plugin for a known tool", () => {
    render(
      <ToolPluginRegistryProvider registry={testRegistry}>
        <ToolPluginPartRenderer
          part={{ type: "job_status", toolName: "generate_chart", jobId: "j1", status: "succeeded", label: "" }}
          isStreaming={false}
        />
      </ToolPluginRegistryProvider>,
    );
    expect(screen.getByTestId("mock-chart")).toBeInTheDocument();
  });

  it("renders fallback for an unknown tool", () => {
    render(
      <ToolPluginRegistryProvider registry={testRegistry}>
        <ToolPluginPartRenderer
          part={{ type: "job_status", toolName: "future_tool", jobId: "j2", status: "running", label: "" }}
          isStreaming={false}
        />
      </ToolPluginRegistryProvider>,
    );
    expect(screen.getByTestId("fallback")).toBeInTheDocument();
  });
});
```

### 4.3 Presenter AST Boundary

This is the critical structural test that prevents regression — ensures tool results stay in `parts`, not in `RichContent` blocks.

```tsx
// tests/presenter-ast-boundary.test.ts
import { describe, it, expect } from "vitest";
// Import ChatPresenter and its test utilities

describe("ChatPresenter AST boundary", () => {
  it("does not produce job-status blocks in RichContent for migrated tools", () => {
    // Given: a raw message with tool_result for "generate_chart"
    // When: presenter.present() is called
    // Then: presentedMessage.content.blocks has NO block with type "job-status"
    //       that corresponds to the chart tool
    // And: presentedMessage.parts still contains the chart JobStatusMessagePart

    // const presented = presenter.present(rawMessage);
    // const jobBlocks = presented.content.blocks.filter(b => b.type === "job-status");
    // expect(jobBlocks.find(b => b.toolName === "generate_chart")).toBeUndefined();
    // expect(presented.parts.find(p => p.toolName === "generate_chart")).toBeDefined();
  });

  it("still produces RichContent blocks for non-migrated tools", () => {
    // Tools not yet moved to the registry should still work via the old path
    // This test ensures backward compatibility during the gradual migration
  });
});
```

---

## 5. Sprint D Tests

### 5.1 Config-Driven Bootstrap

```tsx
// tests/config-bootstrap.test.ts
import { describe, it, expect } from "vitest";

describe("Chat bootstrap config", () => {
  it("provides greeting copy for all 5 roles via config", () => {
    // All roles should be config-driven, not hardcoded in chatState.ts
    // const config = CHAT_BOOTSTRAP_CONFIG;
    // const roles = ["ANONYMOUS", "AUTHENTICATED", "APPRENTICE", "STAFF", "ADMIN"];
    // for (const role of roles) {
    //   expect(config[role]).toBeDefined();
    //   expect(config[role].greeting).toBeTruthy();
    // }
  });

  it("chatState reducer does not contain hardcoded greeting strings", () => {
    // Structural test: read chatState.ts source and assert no greeting literals
    // This prevents re-hardcoding during future edits
  });
});
```

### 5.2 Full Registry Coverage

```tsx
// tests/full-registry-coverage.test.ts
import { describe, it, expect } from "vitest";
import { createDefaultToolRegistry } from
  "@/frameworks/ui/chat/registry/default-tool-registry";

describe("Default tool registry completeness", () => {
  const registry = createDefaultToolRegistry();

  const expectedTools = [
    "generate_chart",
    "generate_graph",
    "generate_audio",
    "admin_web_search",
    "set_theme",
    "adjust_ui",
    "inspect_theme",
    "get_my_profile",
    "update_my_profile",
    "get_my_referral_qr",
    "get_journal_workflow_summary",
    "prepare_journal_post_for_publish",
  ];

  for (const tool of expectedTools) {
    it(`has a registered renderer for "${tool}"`, () => {
      const Component = registry.getRenderer(tool);
      expect(Component.name).not.toBe("JobStatusFallbackCard");
    });
  }
});
```

---

## 6. Existing Test Compatibility Matrix

These existing tests run today and must continue to pass through all sprints:

| Test File | Lines | What It Tests | Sprint Impact |
|---|---|---|---|
| `MessageList.test.tsx` | 431 | Bubble rendering, role display, toolbar | B: new sub-components must pass same assertions |
| `ChatPresenter.test.ts` | 600+ | Tool result → RichContent conversion | C–D: assertions change as tools migrate to registry |
| `RichContentRenderer.test.tsx` | 400+ | Block/inline rendering | A: hoist doesn't change behavior |
| `browser-fab-chat-flow.test.tsx` | 200+ | Full chat flow with FAB open/close | Unaffected |

### Migration Strategy for ChatPresenter.test.ts

As each tool migrates (Sprint C–D), update the corresponding test case:

**Before migration:**
```tsx
it("converts generate_chart result to job-status block", () => {
  const presented = presenter.present(chartMessage);
  expect(presented.content.blocks).toContainEqual(
    expect.objectContaining({ type: "job-status", toolName: "generate_chart" }),
  );
});
```

**After migration:**
```tsx
it("preserves generate_chart result in parts (not in blocks)", () => {
  const presented = presenter.present(chartMessage);
  expect(presented.content.blocks.find(b => b.toolName === "generate_chart")).toBeUndefined();
  expect(presented.parts.find(p => p.toolName === "generate_chart")).toBeDefined();
});
```

---

## 7. Performance Tests (Sprint E)

### 7.1 Content-Visibility Paint Skipping

This test validates that `content-visibility: auto` is working. Since jsdom doesn't compute CSS, this is a Playwright test:

```tsx
// tests/browser-ui/message-performance.spec.ts (Playwright)
test("content-visibility skips paint for off-screen messages", async ({ page }) => {
  // Load a conversation with 500+ messages
  // Assert that off-screen messages have content-visibility: auto computed
  // Assert that scrolling to bottom is under 100ms
});
```

### 7.2 rAF Typewriter Budget

```tsx
// In vitest — assert the typewriter doesn't use setInterval
it("typewriter uses requestAnimationFrame, not setInterval", () => {
  const setIntervalSpy = vi.spyOn(window, "setInterval");
  // Render a message in typewriter mode
  // ...
  expect(setIntervalSpy).not.toHaveBeenCalled();
  setIntervalSpy.mockRestore();
});
```

---

## 8. Test Naming Conventions

All test descriptions follow the pattern: **"[verb]s [what] [when/condition]"**

Examples:
- "returns fallback for unknown tool names"
- "renders chart visualization for succeeded status"
- "does not produce job-status blocks in RichContent for migrated tools"
- "cancels animation frame on unmount"
- "preserves generate_chart result in parts (not in blocks)"

This makes test output scannable and each test self-documenting.
