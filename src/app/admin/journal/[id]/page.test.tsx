import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionUserMock,
  findByIdMock,
  listByPostIdMock,
  listHeroCandidatesMock,
  listArtifactsMock,
  revalidatePathMock,
  redirectMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  findByIdMock: vi.fn(),
  listByPostIdMock: vi.fn(),
  listHeroCandidatesMock: vi.fn(),
  listArtifactsMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  notFoundMock: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  notFound: notFoundMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getBlogPostRepository: () => ({
    findById: findByIdMock,
    listForAdmin: vi.fn(),
    countForAdmin: vi.fn(),
  }),
  getBlogPostRevisionRepository: () => ({
    listByPostId: listByPostIdMock,
  }),
  getJournalEditorialMutationRepository: () => ({
    restoreRevisionAtomically: vi.fn(),
  }),
  getBlogAssetRepository: () => ({
    listHeroCandidates: listHeroCandidatesMock,
  }),
  getBlogPostArtifactRepository: () => ({
    listByPost: listArtifactsMock,
  }),
}));

import AdminJournalDetailPage from "@/app/admin/journal/[id]/page";

describe("/admin/journal/[id] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue({ id: "admin_1", email: "admin@example.com", name: "Admin", roles: ["ADMIN"] });
    findByIdMock.mockResolvedValue({
      id: "post_1",
      slug: "ops-ledger",
      title: "Ops Ledger",
      description: "Operational description.",
      content: "## Draft\n\nBody copy.",
      standfirst: null,
      section: null,
      heroImageAssetId: null,
      status: "draft",
      publishedAt: null,
      createdAt: "2026-03-26T00:00:00.000Z",
      updatedAt: "2026-03-26T10:00:00.000Z",
      createdByUserId: "admin_1",
      publishedByUserId: null,
    });
    listByPostIdMock.mockResolvedValue([
      {
        id: "rev_1",
        postId: "post_1",
        snapshot: {
          slug: "ops-ledger",
          title: "Ops Ledger",
          description: "Operational description.",
          standfirst: null,
          content: "## Draft\n\nBody copy.",
          section: null,
          status: "draft",
        },
        changeNote: "Initial draft.",
        createdByUserId: "admin_1",
        createdAt: "2026-03-26T10:00:00.000Z",
      },
    ]);
    listHeroCandidatesMock.mockResolvedValue([
      {
        id: "asset_1",
        postId: "post_1",
        kind: "hero",
        storagePath: "2026/post/hero.png",
        mimeType: "image/png",
        width: 1200,
        height: 630,
        altText: "Hero candidate",
        sourcePrompt: null,
        provider: null,
        providerModel: null,
        visibility: "draft",
        selectionState: "candidate",
        variationGroupId: null,
        createdByUserId: "admin_1",
        createdAt: "2026-03-26T10:01:00.000Z",
        updatedAt: "2026-03-26T10:01:00.000Z",
      },
    ]);
    listArtifactsMock.mockResolvedValue([
      {
        id: "artifact_1",
        postId: "post_1",
        artifactType: "article_qa_report",
        payload: { summary: "Looks publishable." },
        createdByUserId: "admin_1",
        createdAt: "2026-03-26T10:02:00.000Z",
      },
    ]);
  });

  it("redirects anonymous visitors to login", async () => {
    getSessionUserMock.mockResolvedValueOnce({ id: "anon_1", email: "anon@example.com", name: "Anon", roles: ["ANONYMOUS"] });

    await expect(AdminJournalDetailPage({ params: Promise.resolve({ id: "post_1" }) })).rejects.toThrow("redirect:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("returns not found for non-admin visitors", async () => {
    getSessionUserMock.mockResolvedValueOnce({ id: "usr_1", email: "user@example.com", name: "User", roles: ["AUTHENTICATED"] });

    await expect(AdminJournalDetailPage({ params: Promise.resolve({ id: "post_1" }) })).rejects.toThrow("notFound");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("renders the detail workspace with revision, hero, and artifact context", async () => {
    render(await AdminJournalDetailPage({ params: Promise.resolve({ id: "post_1" }) }));

    expect(screen.getByRole("heading", { name: "Ops Ledger" })).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("Ops Ledger")).toHaveLength(2);
    expect(screen.getByPlaceholderText("Optional standfirst for the journal article.")).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Section" })).toHaveValue("");
    expect(screen.getByLabelText("Draft body")).toHaveValue("## Draft\n\nBody copy.");
    expect(screen.getByAltText("Hero candidate")).toHaveAttribute("src", "/api/blog/assets/asset_1");
    expect(screen.getByText("Looks publishable.")).toBeInTheDocument();
    expect(screen.getByText("Initial draft.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Journal preview" })).toHaveAttribute("href", "/admin/journal/preview/ops-ledger");
  });

  it("renders metadata editing, draft-body editing, workflow controls, and revision restore actions", async () => {
    render(await AdminJournalDetailPage({ params: Promise.resolve({ id: "post_1" }) }));

    expect(screen.getByRole("heading", { name: "Editor" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Publish" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish article" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save settings" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Manual status" })).toHaveValue("review");
    expect(screen.getByRole("button", { name: "Update status" })).toBeInTheDocument();
    expect(screen.getByLabelText("Workflow note")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save draft body" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Optional note for why this body revision is being recorded.")).toBeInTheDocument();
    expect(screen.getByText("Advanced workflow")).toBeInTheDocument();
    expect(screen.getByText("Post settings")).toBeInTheDocument();
    expect(screen.getByText("Featured image")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Optional note describing this metadata edit.")).not.toBeInTheDocument();
    expect(screen.getByText("By admin_1")).toBeInTheDocument();
    expect(screen.getByText("Restore preview")).toBeInTheDocument();
    expect(screen.getByText("Matches current draft")).toBeInTheDocument();
    expect(screen.getByText("Current draft")).toBeInTheDocument();
    expect(screen.getByText("Revision snapshot")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore revision" })).toBeInTheDocument();
    expect(screen.getByLabelText("Restore note for rev_1")).toBeInTheDocument();
  });

  it("renders changed-field summaries when a revision differs from the current draft", async () => {
    listByPostIdMock.mockResolvedValueOnce([
      {
        id: "rev_2",
        postId: "post_1",
        snapshot: {
          slug: "ops-ledger-v1",
          title: "Ops Ledger Draft One",
          description: "Earlier operational description.",
          standfirst: null,
          content: "## Earlier Draft\n\nOriginal copy.",
          section: "essay",
          status: "review",
        },
        changeNote: "Submitted first review draft.",
        createdByUserId: "admin_1",
        createdAt: "2026-03-26T09:00:00.000Z",
      },
    ]);

    render(await AdminJournalDetailPage({ params: Promise.resolve({ id: "post_1" }) }));

    expect(screen.getByText("Changes: Title, Description, Section, Workflow, Body")).toBeInTheDocument();
    expect(screen.getAllByText("Ops Ledger Draft One")).toHaveLength(2);
    expect(screen.getByText(/Earlier operational description\./i)).toBeInTheDocument();
  });

  it("renders safe empty states when there are no hero candidates or artifacts", async () => {
    listHeroCandidatesMock.mockResolvedValueOnce([]);
    listArtifactsMock.mockResolvedValueOnce([]);

    render(await AdminJournalDetailPage({ params: Promise.resolve({ id: "post_1" }) }));

    expect(screen.getByText("No hero image selected yet.")).toBeInTheDocument();
    expect(screen.getByText("No artifacts recorded yet.")).toBeInTheDocument();
  });

  it("renders safe fallback text when a revision has no change note", async () => {
    listByPostIdMock.mockResolvedValueOnce([
      {
        id: "rev_1",
        postId: "post_1",
        snapshot: {
          slug: "ops-ledger",
          title: "Ops Ledger",
          description: "Operational description.",
          standfirst: null,
          content: "## Draft\n\nBody copy.",
          section: null,
          status: "draft",
        },
        changeNote: null,
        createdByUserId: "admin_1",
        createdAt: "2026-03-26T10:00:00.000Z",
      },
    ]);

    render(await AdminJournalDetailPage({ params: Promise.resolve({ id: "post_1" }) }));

    expect(screen.getByText("No change note recorded.")).toBeInTheDocument();
  });

  it("renders published metadata when the post is already live", async () => {
    findByIdMock.mockResolvedValueOnce({
      id: "post_1",
      slug: "ops-ledger",
      title: "Ops Ledger",
      description: "Operational description.",
      content: "## Draft\n\nBody copy.",
      standfirst: "Published standfirst.",
      section: "essay",
      heroImageAssetId: null,
      status: "published",
      publishedAt: "2026-03-26T11:00:00.000Z",
      createdAt: "2026-03-26T00:00:00.000Z",
      updatedAt: "2026-03-26T11:00:00.000Z",
      createdByUserId: "admin_1",
      publishedByUserId: "admin_1",
    });

    render(await AdminJournalDetailPage({ params: Promise.resolve({ id: "post_1" }) }));

    expect(screen.getByDisplayValue("Essay")).toBeInTheDocument();
    expect(screen.getByLabelText("Current publishing status: Published")).toBeInTheDocument();
    expect(screen.getAllByText("Published Mar 26, 2026, 11:00 AM")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Publish article" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View published" })).toHaveAttribute("href", "/admin/journal/preview/ops-ledger");
    expect(screen.getByRole("combobox", { name: "Manual status" })).toHaveValue("approved");
  });

  it("returns not found when the post id does not resolve", async () => {
    findByIdMock.mockResolvedValueOnce(null);

    await expect(AdminJournalDetailPage({ params: Promise.resolve({ id: "missing" }) })).rejects.toThrow("notFound");
    expect(notFoundMock).toHaveBeenCalled();
  });
});