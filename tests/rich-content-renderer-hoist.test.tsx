import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("RichContentRenderer registry hoist", () => {
  it("keeps blockRegistry at module scope after RichContentRenderer", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/frameworks/ui/RichContentRenderer.tsx"),
      "utf-8",
    );

    expect(source).toMatch(/export const RichContentRenderer[\s\S]*?\n};\n\ntype BlockProps[\s\S]*?\nconst blockRegistry:/);
  });

  it("keeps inlineRegistry at module scope after BlockRenderer", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/frameworks/ui/RichContentRenderer.tsx"),
      "utf-8",
    );

    expect(source).toMatch(/const BlockRenderer[\s\S]*?\n};\n\ntype InlineProps[\s\S]*?\nconst inlineRegistry:/);
  });
});
