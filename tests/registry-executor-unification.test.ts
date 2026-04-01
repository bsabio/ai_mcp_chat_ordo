import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/adapters/RepositoryFactory", () => ({
  getCorpusRepository: vi.fn(() => ({
    getSections: vi.fn(() => []),
    getSection: vi.fn(),
    getSummary: vi.fn(),
    getChecklist: vi.fn(),
    getPractitioners: vi.fn(),
  })),
  getBlogAssetRepository: vi.fn(() => ({})),
  getBlogPostRepository: vi.fn(() => ({})),
  getJobStatusQuery: vi.fn(() => ({
    getJobStatus: vi.fn(),
    listJobs: vi.fn(),
    listJobsByUser: vi.fn(),
    listJobsByConversation: vi.fn(),
  })),
  getBlogPostRevisionRepository: vi.fn(() => ({})),
  getJournalEditorialMutationRepository: vi.fn(() => ({})),
}));

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    prepare: vi.fn(() => ({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(() => []),
    })),
  })),
}));

vi.mock("@/lib/chat/search-pipeline", () => ({
  getSearchHandler: vi.fn(() => ({
    search: vi.fn(() => []),
  })),
}));

vi.mock("@/lib/chat/embedding-module", () => ({
  getEmbeddingPipelineFactory: vi.fn(),
  getBookPipeline: vi.fn(),
  getCorpusPipeline: vi.fn(),
}));

vi.mock("@/adapters/LocalEmbedder", () => ({
  localEmbedder: {
    embed: vi.fn(() => [0]),
  },
}));

vi.mock("@/adapters/SQLiteVectorStore", () => ({
  SQLiteVectorStore: class MockSQLiteVectorStore {
    search = vi.fn(() => []);
  },
}));

vi.mock("@/adapters/UserPreferencesDataMapper", () => ({
  UserPreferencesDataMapper: class MockUserPreferencesDataMapper {
    get = vi.fn();
    set = vi.fn();
    getAll = vi.fn(() => []);
  },
}));

vi.mock("@/lib/config/instance", () => ({
  getInstanceTools: vi.fn(() => ({})),
}));

vi.mock("@/lib/profile/profile-service", () => ({
  createProfileService: vi.fn(() => ({})),
}));

vi.mock("@/lib/operator/operator-signal-loaders", () => ({
  loadOperatorLeadQueue: vi.fn(),
  loadOperatorFunnelRecommendations: vi.fn(),
  loadOperatorAnonymousOpportunities: vi.fn(),
  loadOperatorRecentConversations: vi.fn(),
  loadOperatorRoutingReview: vi.fn(),
}));

vi.mock("@/lib/blog/blog-production-root", () => ({
  getBlogArticleProductionService: vi.fn(() => ({})),
  getBlogImageGenerationService: vi.fn(() => ({})),
}));

import {
  getToolComposition,
  _resetToolComposition,
} from "@/lib/chat/tool-composition-root";

describe("Spec 01: Registry/Executor Unification", () => {
  beforeEach(() => {
    _resetToolComposition();
  });

  it("getToolComposition returns same registry and executor on repeated calls", () => {
    const first = getToolComposition();
    const second = getToolComposition();

    expect(first.registry).toBe(second.registry);
    expect(first.executor).toBe(second.executor);
    expect(first).toBe(second);
  });

  it("executor operates on the same registry used for descriptor lookup", async () => {
    const { registry, executor } = getToolComposition();
    const calcDescriptor = registry.getDescriptor("calculator");

    expect(calcDescriptor).toBeDefined();
    expect(calcDescriptor!.name).toBe("calculator");

    // Execute the calculator tool — it should succeed because the executor
    // wraps the same registry instance.
    const result = await executor(
      "calculator",
      { operation: "add", a: 2, b: 2 },
      { role: "ANONYMOUS", userId: "test-user" },
    );

    expect(result).toBeDefined();
  });

  it("_resetToolComposition causes fresh instances on next call", () => {
    const first = getToolComposition();
    _resetToolComposition();
    const second = getToolComposition();

    expect(first.registry).not.toBe(second.registry);
    expect(first.executor).not.toBe(second.executor);
    expect(first).not.toBe(second);
  });

  it("executor respects RBAC — denies unauthorized roles", async () => {
    const { registry, executor } = getToolComposition();

    // Find an ADMIN-only tool
    const adminToolName = "admin_web_search";
    const descriptor = registry.getDescriptor(adminToolName);

    if (!descriptor) {
      // If the tool isn't registered (filtered by instance config), skip
      return;
    }

    // ANONYMOUS should not be able to execute an admin tool
    const canExecute = registry.canExecute(adminToolName, "ANONYMOUS");
    expect(canExecute).toBe(false);

    await expect(
      executor(adminToolName, {}, { role: "ANONYMOUS", userId: "test-user" }),
    ).rejects.toThrow();
  });

  it("composition result is frozen", () => {
    const result = getToolComposition();

    expect(Object.isFrozen(result)).toBe(true);

    // Attempting to mutate should throw in strict mode or silently fail
    expect(() => {
      (result as unknown as Record<string, unknown>).registry = null;
    }).toThrow();
  });
});
