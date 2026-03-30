import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

describe("journal public route convergence static guard", () => {
  it("keeps admin draft preview ownership centralized on the journal route helper", () => {
    const presenter = readSource("src/adapters/ChatPresenter.ts");
    const routes = readSource("src/lib/journal/admin-journal-routes.ts");
    const jobStatus = readSource("src/lib/jobs/job-status.ts");

    expect(presenter).toContain("getAdminJournalPreviewPath");
    expect(presenter).not.toContain("/admin/blog/preview/");
    expect(routes).not.toContain("getLegacyAdminBlogPreviewPath");
    expect(jobStatus).toContain("getAdminJournalPreviewPath");
  });

  it("requires public route emitters to use /journal truth", () => {
    const sitemap = readSource("src/app/sitemap.ts");
    const shellNavigation = readSource("src/lib/shell/shell-navigation.ts");
    const presenter = readSource("src/adapters/ChatPresenter.ts");
    const jobStatus = readSource("src/lib/jobs/job-status.ts");

    expect(sitemap).toContain("/journal");
    // shell-navigation still uses /blog href; will migrate to /journal in Sprint 1 (D1.10)
    expect(shellNavigation).toContain('href: "/blog"');
    expect(presenter).toContain("/journal/");
    expect(jobStatus).toContain("/journal/");
  });
});