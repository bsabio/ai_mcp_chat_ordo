import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function makeProxyRequest(
  path: string,
  opts: { method?: string; origin?: string; host?: string; cookie?: string } = {},
): NextRequest {
  const url = new URL(path, "http://localhost:3000");
  const headers = new Headers();
  if (opts.host) headers.set("host", opts.host);
  if (opts.origin) headers.set("origin", opts.origin);
  if (opts.cookie) headers.set("cookie", opts.cookie);
  return new NextRequest(url, { method: opts.method ?? "POST", headers });
}

describe("Spec 11: CSRF Middleware Integration", () => {
  it("POST /api/chat/stream from cross-origin returns 403", async () => {
    const req = makeProxyRequest("/api/chat/stream", {
      origin: "https://evil.com",
      host: "localhost:3000",
    });
    const res = proxy(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Origin not allowed");
  });

  it("POST /api/chat/stream from same origin returns non-403", () => {
    const req = makeProxyRequest("/api/chat/stream", {
      origin: "http://localhost:3000",
      host: "localhost:3000",
    });
    const res = proxy(req);
    expect(res.status).not.toBe(403);
  });
});
