// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { collectCurrentPageSnapshot } from "@/lib/chat/collect-current-page-snapshot";

describe("collectCurrentPageSnapshot", () => {
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
});