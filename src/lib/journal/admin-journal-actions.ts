import type { BlogPostDraftPatch, BlogPostEditorialMetadataPatch, BlogPostSection, BlogPostStatus } from "@/core/entities/blog";
import { JournalEditorialInteractor, ALLOWED_TRANSITIONS } from "@/core/use-cases/JournalEditorialInteractor";
import {
  getBlogPostRepository,
  getBlogPostRevisionRepository,
  getJournalEditorialMutationRepository,
} from "@/adapters/RepositoryFactory";
import { readRequiredText, readOptionalText } from "@/lib/admin/shared/admin-form-parsers";

type WorkflowActionDescriptor = {
  nextStatus: BlogPostStatus;
  label: string;
  description: string;
};


function parseOptionalSection(value: FormDataEntryValue | null): BlogPostSection | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  if (normalized === "essay" || normalized === "briefing") {
    return normalized;
  }

  throw new Error(`Invalid section: ${normalized}`);
}

export function createJournalEditorialInteractor(): JournalEditorialInteractor {
  return new JournalEditorialInteractor(
    getBlogPostRepository(),
    getBlogPostRevisionRepository(),
    getJournalEditorialMutationRepository(),
  );
}

export function getWorkflowActionDescriptors(status: BlogPostStatus): WorkflowActionDescriptor[] {
  return ALLOWED_TRANSITIONS[status].map((nextStatus) => {
    switch (nextStatus) {
      case "review":
        return {
          nextStatus,
          label: status === "approved" ? "Return to review" : "Submit for review",
          description: status === "approved"
            ? "Move this article back into editorial review."
            : "Move this draft into editorial review.",
        };
      case "approved":
        return {
          nextStatus,
          label: status === "published" ? "Return to approved" : "Approve for publish",
          description: status === "published"
            ? "Unpublish this article and return it to approved status."
            : "Mark this article approved and ready to publish.",
        };
      case "published":
        return {
          nextStatus,
          label: "Publish to journal",
          description: "Make this article publicly visible in the journal.",
        };
      case "draft":
        return {
          nextStatus,
          label: "Return to draft",
          description: "Move this article back to draft for further editing.",
        };
    }
  });
}

export function parseMetadataForm(formData: FormData): BlogPostEditorialMetadataPatch {
  return {
    slug: readRequiredText(formData, "slug"),
    title: readRequiredText(formData, "title"),
    description: readRequiredText(formData, "description"),
    standfirst: readOptionalText(formData, "standfirst"),
    section: parseOptionalSection(formData.get("section")),
  };
}

export function parseDraftBodyForm(formData: FormData): BlogPostDraftPatch {
  return {
    content: readRequiredText(formData, "content"),
  };
}

export function parseWorkflowForm(formData: FormData): {
  nextStatus: BlogPostStatus;
  changeNote: string | null;
} {
  const nextStatus = readRequiredText(formData, "nextStatus");
  if (!(nextStatus in ALLOWED_TRANSITIONS)) {
    throw new Error(`Invalid workflow status: ${nextStatus}`);
  }

  return {
    nextStatus: nextStatus as BlogPostStatus,
    changeNote: readOptionalText(formData, "changeNote"),
  };
}

export function parseRestoreForm(formData: FormData): {
  revisionId: string;
  changeNote: string | null;
} {
  return {
    revisionId: readRequiredText(formData, "revisionId"),
    changeNote: readOptionalText(formData, "changeNote"),
  };
}