import { afterEach, describe, expect, it } from "vitest";
import { GET as liveGet } from "@/app/api/health/live/route";
import { GET as readyGet } from "@/app/api/health/ready/route";

const ORIGINAL_ENV = process.env;

describe("health routes", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns 200 from live endpoint", async () => {
    const response = await liveGet();
    expect(response.status).toBe(200);
  });

  it("returns 200 from ready endpoint when config valid", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      ANTHROPIC_API_KEY: "test-key",
    };

    const response = await readyGet();
    expect(response.status).toBe(200);
  });

  it("returns 503 from ready endpoint when config invalid", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      ANTHROPIC_API_KEY: "",
      API__ANTHROPIC_API_KEY: "",
    };

    const response = await readyGet();
    expect(response.status).toBe(503);
  });
});
