// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

import { collectCurrentPageSnapshot } from "@/lib/chat/collect-current-page-snapshot";

describe("collectCurrentPageSnapshot", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.title = "";
  });

  it("captures the current page content while excluding chat surfaces", () => {
    document.title = "Register | Studio Ordo";
    document.body.innerHTML = `
      <main data-shell-main-surface="default">
        <section>
          <h1>Create Account</h1>
          <p>Save conversations, unlock richer tools, and get QR referral tools.</p>
          <h2>Password</h2>
        </section>
        <section data-chat-container-mode="embedded">
          <p>You're on the Library page (/library).</p>
        </section>
      </main>
      <section data-chat-floating-shell="true">
        <p>Floating chat says Library too.</p>
      </section>
    `;

    const snapshot = collectCurrentPageSnapshot("/register");

    expect(snapshot).toMatchObject({
      pathname: "/register",
      title: "Register | Studio Ordo",
      mainHeading: "Create Account",
      sectionHeadings: ["Password"],
    });
    expect(snapshot?.contentExcerpt).toContain("Save conversations, unlock richer tools");
    expect(snapshot?.contentExcerpt).not.toContain("Library page");
    expect(snapshot?.contentExcerpt).not.toContain("Floating chat says Library");
  });

  it("deduplicates section headings", () => {
    document.title = "Test";
    document.body.innerHTML = `
      <main data-shell-main-surface="">
        <h1>Title</h1>
        <h2>Same Heading</h2>
        <h2>Same Heading</h2>
        <h2>Different</h2>
      </main>
    `;
    const snap = collectCurrentPageSnapshot("/test");
    expect(snap?.sectionHeadings).toEqual(["Same Heading", "Different"]);
  });

  it("falls back to document.body when no content root found", () => {
    document.title = "Fallback";
    document.body.innerHTML = "<p>Body fallback content</p>";
    const snap = collectCurrentPageSnapshot("/test");
    expect(snap?.contentExcerpt).toContain("Body fallback content");
  });

  it("returns undefined for empty pathname", () => {
    document.title = "Page";
    document.body.innerHTML = "<main><h1>Heading</h1></main>";
    expect(collectCurrentPageSnapshot("")).toBeUndefined();
  });

  it("excludes nav and footer elements from excerpt", () => {
    document.title = "Page";
    document.body.innerHTML = `
      <main data-shell-main-surface="">
        <h1>Heading</h1>
        <p>Visible content</p>
        <nav>Nav links</nav>
        <footer>Footer text</footer>
      </main>
    `;
    const snap = collectCurrentPageSnapshot("/test");
    expect(snap?.contentExcerpt).toContain("Visible content");
    expect(snap?.contentExcerpt).not.toContain("Nav links");
    expect(snap?.contentExcerpt).not.toContain("Footer text");
  });

  it("normalizes whitespace in content", () => {
    document.title = "Page";
    document.body.innerHTML = `
      <main data-shell-main-surface="">
        <h1>Heading</h1>
        <p>  Extra   whitespace   here  </p>
      </main>
    `;
    const snap = collectCurrentPageSnapshot("/test");
    expect(snap?.contentExcerpt).toContain("Extra whitespace here");
  });
});