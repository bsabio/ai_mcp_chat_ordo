import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

function makeRequest(path: string, cookie?: string): NextRequest {
  const url = new URL(path, "http://localhost:3000");
  const headers = new Headers();
  if (cookie) {
    headers.set("cookie", `lms_session_token=${cookie}`);
  }
  return new NextRequest(url, { headers });
}

describe("Edge middleware", () => {
  it("passes public auth routes without cookie", () => {
    const res = middleware(makeRequest("/api/auth/register"));
    expect(res.status).toBe(200);

    const res2 = middleware(makeRequest("/api/auth/login"));
    expect(res2.status).toBe(200);
  });

  it("passes chat routes without cookie (ANONYMOUS access)", () => {
    const res = middleware(makeRequest("/api/chat/stream"));
    expect(res.status).toBe(200);
  });

  it("passes health routes without cookie", () => {
    const res = middleware(makeRequest("/api/health/live"));
    expect(res.status).toBe(200);
  });

  it("returns 401 for /api/auth/me without cookie", async () => {
    const res = middleware(makeRequest("/api/auth/me"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Authentication required");
  });

  it("returns 401 for /api/auth/logout without cookie", async () => {
    const res = middleware(makeRequest("/api/auth/logout"));
    expect(res.status).toBe(401);
  });

  it("returns 401 for /api/auth/switch without cookie", async () => {
    const res = middleware(makeRequest("/api/auth/switch"));
    expect(res.status).toBe(401);
  });

  it("returns 401 for /api/conversations without cookie", async () => {
    const res = middleware(makeRequest("/api/conversations"));
    expect(res.status).toBe(401);
  });

  it("passes protected routes when cookie is present", () => {
    const res = middleware(makeRequest("/api/auth/me", "some-token"));
    expect(res.status).toBe(200);
  });

  it("passes page routes without cookie", () => {
    const res = middleware(makeRequest("/login"));
    expect(res.status).toBe(200);
  });
});
