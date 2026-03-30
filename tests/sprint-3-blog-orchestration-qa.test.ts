import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

function fileExists(relativePath: string): boolean {
  return existsSync(join(process.cwd(), relativePath));
}

describe("Sprint 3 public route cutover QA guards", () => {
  it("preserves journal-named admin draft preview convergence", () => {
    const presenter = readSource("src/adapters/ChatPresenter.ts");
    const routes = readSource("src/lib/journal/admin-journal-routes.ts");

    expect(presenter).toContain('actionLinkNode("Open draft", getAdminJournalPreviewPath(part.resultPayload.slug))');
    expect(presenter).not.toContain('/admin/blog/preview/${part.resultPayload.slug}');
    expect(routes).not.toContain("getLegacyAdminBlogPreviewPath");
    expect(fileExists("src/app/admin/blog/preview/[slug]/page.tsx")).toBe(false);
  });

  it("adds canonical /journal public route modules", () => {
    expect(fileExists("src/app/journal/page.tsx")).toBe(true);
    expect(fileExists("src/app/journal/[slug]/page.tsx")).toBe(true);
  });

  it("moves sitemap and shell public route truth to /journal", () => {
    const sitemap = readSource("src/app/sitemap.ts");
    const shellNavigation = readSource("src/lib/shell/shell-navigation.ts");
    const appShell = readSource("src/components/AppShell.tsx");
    const siteNav = readSource("src/components/SiteNav.tsx");

    expect(sitemap).toContain("${base}/journal");
    // shell-navigation still uses /blog href; full migration deferred to Sprint 1 (D1.10)
    expect(shellNavigation).toContain('href: "/blog"');
    // AppShell and SiteNav handle both /journal and /blog routes during migration
    expect(appShell).toContain('pathname === "/journal"');
    expect(siteNav).toContain('pathname === "/journal"');
  });

  it("moves published public emitters to /journal while keeping admin preview routes journal-first", () => {
    const presenter = readSource("src/adapters/ChatPresenter.ts");
    const jobStatus = readSource("src/lib/jobs/job-status.ts");

    expect(presenter).toContain('actionLinkNode("Open published post", `/journal/${part.resultPayload.slug}`)');
    expect(presenter).not.toContain('actionLinkNode("Open published post", `/blog/${part.resultPayload.slug}`)');
    expect(jobStatus).toContain("/journal/${candidate.slug}");
    expect(jobStatus).not.toContain("/blog/${candidate.slug}");
    expect(jobStatus).toContain("getAdminJournalPreviewPath");
  });
});