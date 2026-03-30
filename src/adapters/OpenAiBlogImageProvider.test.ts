import { describe, expect, it, vi } from "vitest";

import { OpenAiBlogImageProvider } from "@/adapters/OpenAiBlogImageProvider";

describe("OpenAiBlogImageProvider", () => {
  it("decodes image bytes and surfaces prompt metadata", async () => {
    const generate = vi.fn().mockResolvedValue({
      data: [{
        b64_json: Buffer.from("image-bytes").toString("base64"),
        revised_prompt: "Refined prompt",
        mime_type: "image/png",
      }],
    });
    const provider = new OpenAiBlogImageProvider({
      images: { generate },
    } as never);

    const result = await provider.generate({
      prompt: "Original prompt",
      size: "1536x1024",
      quality: "high",
      enhancePrompt: true,
    });

    expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-image-1",
      prompt: "Original prompt",
      size: "1536x1024",
      quality: "high",
    }));
    expect(result).toMatchObject({
      mimeType: "image/png",
      width: 1536,
      height: 1024,
      originalPrompt: "Original prompt",
      finalPrompt: "Refined prompt",
      provider: "openai",
      model: "gpt-image-1",
    });
    expect(result.bytes.toString("utf8")).toBe("image-bytes");
  });

  it("preserves the original prompt and leaves dimensions null when enhancement is disabled and size is auto", async () => {
    const generate = vi.fn().mockResolvedValue({
      data: [{
        b64_json: Buffer.from("auto-image-bytes").toString("base64"),
        revised_prompt: "Provider revised prompt",
        mime_type: "image/png",
      }],
    });
    const provider = new OpenAiBlogImageProvider({
      images: { generate },
    } as never);

    const result = await provider.generate({
      prompt: "Original prompt",
      size: "auto",
      quality: "auto",
      enhancePrompt: false,
    });

    expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      size: undefined,
      quality: undefined,
    }));
    expect(result).toMatchObject({
      width: null,
      height: null,
      originalPrompt: "Original prompt",
      finalPrompt: "Original prompt",
    });
    expect(result.bytes.toString("utf8")).toBe("auto-image-bytes");
  });

  it("throws when the provider returns no image bytes", async () => {
    const provider = new OpenAiBlogImageProvider({
      images: { generate: vi.fn().mockResolvedValue({ data: [{}] }) },
    } as never);

    await expect(provider.generate({
      prompt: "Prompt",
      size: "auto",
      quality: "auto",
      enhancePrompt: false,
    })).rejects.toThrow(/no image bytes/i);
  });
});