import { describe, it, expect } from "vitest";
import { UserDataMapper } from "./UserDataMapper";
import Database from "better-sqlite3";
import { ensureSchema } from "../lib/db/schema";

function requireValue<T>(value: T | null | undefined): T {
  expect(value).toBeTruthy();
  if (value == null) {
    throw new Error("Expected value to be present.");
  }
  return value;
}

describe("UserDataMapper", () => {
  it("should retrieve a user by active role", () => {
    const db = new Database(":memory:");
    ensureSchema(db);

    const mapper = new UserDataMapper(db);
    const user = mapper.findByActiveRole("ADMIN");

    expect(user).toBeDefined();
    expect(user?.email).toBe("admin@example.com");
    expect(user?.roles).toContain("ADMIN");

    db.close();
  });

  it("should return null for unknown role", () => {
    const db = new Database(":memory:");
    ensureSchema(db);

    const mapper = new UserDataMapper(db);
    const user = mapper.findByActiveRole("UNKNOWN" as "ADMIN");

    expect(user).toBeNull();

    db.close();
  });

  it("create → findByEmail → findById chain", async () => {
    const db = new Database(":memory:");
    ensureSchema(db);
    const mapper = new UserDataMapper(db);

    const user = await mapper.create({
      email: "test@example.com",
      name: "Test User",
      passwordHash: "$2a$12$testhash",
    });

    expect(user.email).toBe("test@example.com");
    expect(user.name).toBe("Test User");
    expect(user.roles).toEqual(["AUTHENTICATED"]);

    const byEmail = requireValue(await mapper.findByEmail("test@example.com"));
    expect(byEmail.id).toBe(user.id);
    expect(byEmail.passwordHash).toBe("$2a$12$testhash");

    const byId = requireValue(await mapper.findById(user.id));
    expect(byId.email).toBe("test@example.com");
    // Public User type should NOT include passwordHash
    expect(byId).not.toHaveProperty("passwordHash");

    db.close();
  });

  it("duplicate email throws UNIQUE constraint error", async () => {
    const db = new Database(":memory:");
    ensureSchema(db);
    const mapper = new UserDataMapper(db);

    await mapper.create({
      email: "dup@example.com",
      name: "First",
      passwordHash: "$2a$12$hash1",
    });

    await expect(
      mapper.create({
        email: "dup@example.com",
        name: "Second",
        passwordHash: "$2a$12$hash2",
      }),
    ).rejects.toThrow(/UNIQUE/);

    db.close();
  });

  it("findByEmail returns null for nonexistent email", async () => {
    const db = new Database(":memory:");
    ensureSchema(db);
    const mapper = new UserDataMapper(db);

    const result = await mapper.findByEmail("nobody@example.com");
    expect(result).toBeNull();

    db.close();
  });

  it("findById returns null for nonexistent id", async () => {
    const db = new Database(":memory:");
    ensureSchema(db);
    const mapper = new UserDataMapper(db);

    const result = await mapper.findById("usr_nonexistent");
    expect(result).toBeNull();

    db.close();
  });

  it("findProfileById returns referral and credential fields", async () => {
    const db = new Database(":memory:");
    ensureSchema(db);
    const mapper = new UserDataMapper(db);

    const user = await mapper.create({
      email: "profile@example.com",
      name: "Profile User",
      passwordHash: "$2a$12$testhash",
    });

    db.prepare(
      `UPDATE users SET credential = ?, affiliate_enabled = 1, referral_code = ? WHERE id = ?`,
    ).run("Enterprise AI practitioner", "mentor-42", user.id);

    const profile = requireValue(await mapper.findProfileById(user.id));

    expect(profile.credential).toBe("Enterprise AI practitioner");
    expect(profile.affiliateEnabled).toBe(true);
    expect(profile.referralCode).toBe("mentor-42");

    db.close();
  });

  it("enables referral access by default for admin profiles", async () => {
    const db = new Database(":memory:");
    ensureSchema(db);
    const mapper = new UserDataMapper(db);

    const profile = requireValue(await mapper.findProfileById("usr_admin"));

    expect(profile.roles).toContain("ADMIN");
    expect(profile.affiliateEnabled).toBe(true);
    expect(profile.referralCode).toMatch(/^[0-9A-Za-z]{22}$/);

    db.close();
  });

  it("updateProfile persists name, email, and credential changes", async () => {
    const db = new Database(":memory:");
    ensureSchema(db);
    const mapper = new UserDataMapper(db);

    const user = await mapper.create({
      email: "before@example.com",
      name: "Before Name",
      passwordHash: "$2a$12$testhash",
    });

    const updated = await mapper.updateProfile(user.id, {
      name: "After Name",
      email: "after@example.com",
      credential: "AI strategist",
    });

    expect(updated.name).toBe("After Name");
    expect(updated.email).toBe("after@example.com");
    expect(updated.credential).toBe("AI strategist");

    db.close();
  });
});
