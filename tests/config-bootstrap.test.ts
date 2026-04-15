import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createInitialChatMessages } from "@/hooks/chat/chatState";
import { DEFAULT_PROMPTS, type InstancePrompts } from "@/lib/config/defaults";

describe("Config bootstrap", () => {
  it("provides role bootstrap defaults for all authenticated roles", () => {
    expect(DEFAULT_PROMPTS.roleBootstraps?.AUTHENTICATED?.message).toBeTruthy();
    expect(DEFAULT_PROMPTS.roleBootstraps?.APPRENTICE?.message).toBeTruthy();
    expect(DEFAULT_PROMPTS.roleBootstraps?.STAFF?.message).toBeTruthy();
    expect(DEFAULT_PROMPTS.roleBootstraps?.ADMIN?.message).toBeTruthy();
  });

  it("uses roleBootstraps config for ADMIN bootstrap copy", () => {
    const prompts: InstancePrompts = {
      roleBootstraps: {
        ADMIN: {
          message: "Custom founder console.",
          suggestions: ["Review cash flow", "Check queue health"],
        },
      },
    };

    const [message] = createInitialChatMessages("ADMIN", prompts);

    expect(message.content).toContain("Custom founder console.");
    expect(message.content).toContain("Review cash flow");
    expect(message.content).toContain("Check queue health");
  });

  it("falls back to default config when a role-specific override is missing", () => {
    const [message] = createInitialChatMessages("STAFF", {});

    expect(message.content).toContain(
      DEFAULT_PROMPTS.roleBootstraps?.STAFF?.message ?? "",
    );
  });

  it("removes local CHAT_BOOTSTRAP_COPY from chatState", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/hooks/chat/chatState.ts"),
      "utf-8",
    );

    expect(source).not.toContain("CHAT_BOOTSTRAP_COPY");
  });
});
