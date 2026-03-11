import { describe, it, expect } from "vitest";
import { BcryptHasher } from "./BcryptHasher";

describe("BcryptHasher", () => {
  const hasher = new BcryptHasher();

  it("hash then verify round-trip succeeds", async () => {
    const hash = await hasher.hash("mypassword");
    const result = await hasher.verify("mypassword", hash);
    expect(result).toBe(true);
  });

  it("verify rejects wrong password", async () => {
    const hash = await hasher.hash("mypassword");
    const result = await hasher.verify("wrongpassword", hash);
    expect(result).toBe(false);
  });
});
