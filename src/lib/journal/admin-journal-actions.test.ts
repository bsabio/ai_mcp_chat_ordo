import { describe, expect, it } from "vitest";

import {
  getWorkflowActionDescriptors,
  parseDraftBodyForm,
  parseMetadataForm,
  parseRestoreForm,
  parseWorkflowForm,
} from "@/lib/journal/admin-journal-actions";

describe("admin journal action helpers", () => {
  it("returns explicit forward workflow actions for drafts", () => {
    expect(getWorkflowActionDescriptors("draft")).toEqual([
      {
        nextStatus: "review",
        label: "Submit for review",
        description: "Move this draft into editorial review.",
      },
    ]);
  });

  it("returns explicit backward workflow actions for published posts", () => {
    expect(getWorkflowActionDescriptors("published")).toEqual([
      {
        nextStatus: "approved",
        label: "Return to approved",
        description: "Unpublish this article and return it to approved status.",
      },
    ]);
  });

  it("parses metadata form values and normalizes optional fields", () => {
    const formData = new FormData();
    formData.set("slug", "ops-ledger");
    formData.set("title", "Ops Ledger");
    formData.set("description", "Operational description.");
    formData.set("standfirst", "");
    formData.set("section", "essay");

    expect(parseMetadataForm(formData)).toEqual({
      slug: "ops-ledger",
      title: "Ops Ledger",
      description: "Operational description.",
      standfirst: null,
      section: "essay",
    });
  });

  it("parses draft body updates through the canonical draft patch shape", () => {
    const formData = new FormData();
    formData.set("content", "## Updated\n\nRevised body.");

    expect(parseDraftBodyForm(formData)).toEqual({
      content: "## Updated\n\nRevised body.",
    });
  });

  it("rejects invalid metadata sections", () => {
    const formData = new FormData();
    formData.set("slug", "ops-ledger");
    formData.set("title", "Ops Ledger");
    formData.set("description", "Operational description.");
    formData.set("section", "news");

    expect(() => parseMetadataForm(formData)).toThrow(/invalid section/i);
  });

  it("rejects invalid workflow targets", () => {
    const formData = new FormData();
    formData.set("nextStatus", "archived");

    expect(() => parseWorkflowForm(formData)).toThrow(/invalid workflow status/i);
  });

  it("requires a revision id for restore actions", () => {
    const formData = new FormData();

    expect(() => parseRestoreForm(formData)).toThrow(/missing required field: revisionId/i);
  });

  it("requires non-empty draft body content", () => {
    const formData = new FormData();
    formData.set("content", "   ");

    expect(() => parseDraftBodyForm(formData)).toThrow(/missing required field: content/i);
  });
});