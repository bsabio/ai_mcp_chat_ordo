import { describe, expect, it, vi } from "vitest";

import { AnthropicBlogArticlePipelineModel } from "@/adapters/AnthropicBlogArticlePipelineModel";

describe("AnthropicBlogArticlePipelineModel", () => {
  it("normalizes QA reports with empty findings and preserves approved=true when findings exist", async () => {
    const create = vi.fn()
      .mockResolvedValueOnce({
        content: [{
          type: "text",
          text: JSON.stringify({
            approved: true,
            summary: "Looks publishable.",
            findings: [],
          }),
        }],
      })
      .mockResolvedValueOnce({
        content: [{
          type: "text",
          text: JSON.stringify({
            approved: true,
            summary: "Approved with minor notes.",
            findings: [{
              id: "finding_1",
              severity: "low",
              issue: "Optional style tweak",
              recommendation: "Tighten the opening sentence.",
            }],
          }),
        }],
      });
    const model = new AnthropicBlogArticlePipelineModel({
      messages: { create },
    } as never, "claude-haiku-4-5");

    const emptyFindings = await model.reviewArticle({
      title: "Title",
      description: "Description",
      content: "## Heading\n\nBody.",
    });
    const approvedWithFindings = await model.reviewArticle({
      title: "Title",
      description: "Description",
      content: "## Heading\n\nBody.",
    });

    expect(emptyFindings).toMatchObject({
      approved: true,
      summary: "Looks publishable.",
      findings: [],
    });
    expect(approvedWithFindings).toMatchObject({
      approved: true,
      summary: "Approved with minor notes.",
    });
    expect(approvedWithFindings.findings).toEqual([
      {
        id: "finding_1",
        severity: "low",
        issue: "Optional style tweak",
        recommendation: "Tighten the opening sentence.",
      },
    ]);
  });

  it("fails closed when the provider returns malformed JSON", async () => {
    const model = new AnthropicBlogArticlePipelineModel({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{
            type: "text",
            text: "This is not valid JSON.",
          }],
        }),
      },
    } as never, "claude-haiku-4-5");

    await expect(model.reviewArticle({
      title: "Title",
      description: "Description",
      content: "## Heading\n\nBody.",
    })).rejects.toThrow(/did not return valid json/i);
  });
});