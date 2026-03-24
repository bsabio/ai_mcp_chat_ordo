import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import { ensureSchema } from "@/lib/db/schema";

const authTestState = vi.hoisted(() => ({
  testDb: undefined as ReturnType<typeof Database> | undefined,
  cookieJar: new Map<string, string>(),
}));

vi.mock("@/lib/db", () => ({
  getDb: () => authTestState.testDb,
}));

const { repairConversationOwnershipIndex } = vi.hoisted(() => ({
  repairConversationOwnershipIndex: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/chat/embed-conversation", () => ({
  repairConversationOwnershipIndex,
}));

// Mock next/headers cookies
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const val = authTestState.cookieJar.get(name);
      return val ? { name, value: val } : undefined;
    },
    set: (name: string, value: string, options?: { maxAge?: number }) => {
      if (options?.maxAge === 0 || value === "") {
        authTestState.cookieJar.delete(name);
        return;
      }
      authTestState.cookieJar.set(name, value);
    },
    delete: (name: string) => {
      authTestState.cookieJar.delete(name);
    },
  }),
}));

// Import route handlers AFTER mocks are set up
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { GET as meRoute } from "@/app/api/auth/me/route";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";
import { getSessionUser } from "@/lib/auth";

function jsonRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/auth/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Auth API routes — full lifecycle", () => {
  beforeEach(() => {
    authTestState.testDb = new Database(":memory:");
    ensureSchema(authTestState.testDb);
    authTestState.cookieJar = new Map();
    repairConversationOwnershipIndex.mockClear();
  });

  function getTestDb() {
    if (!authTestState.testDb) {
      throw new Error("Test database has not been initialized.");
    }

    return authTestState.testDb;
  }

  function seedAnonymousConversation(sessionId = "anon_seed") {
    const anonUserId = `anon_${sessionId}`;
    getTestDb()
      .prepare(`INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`)
      .run(anonUserId, `${anonUserId}@anonymous.local`, "Anonymous");
    getTestDb()
      .prepare(`INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, 'role_anonymous')`)
      .run(anonUserId);
    getTestDb()
      .prepare(`INSERT INTO conversations (id, user_id, title, status, session_source) VALUES (?, ?, ?, 'archived', 'anonymous_cookie')`)
      .run("conv_anon", anonUserId, "Anonymous chat");
    return anonUserId;
  }

  it("register → login → me → logout → me(401)", async () => {
    // 1. Register
    const regRes = await registerRoute(
      jsonRequest({ email: "test@example.com", password: "password123", name: "Test User" }),
    );
    expect(regRes.status).toBe(201);
    const regBody = await regRes.json();
    expect(regBody.user.email).toBe("test@example.com");
    expect(regBody.user.name).toBe("Test User");
    expect(regBody.user.roles).toContain("AUTHENTICATED");

    // Cookie should have been set
    const sessionToken = authTestState.cookieJar.get("lms_session_token");
    expect(sessionToken).toBeTruthy();

    // 2. Validate session via /me
    const meRes = await meRoute();
    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.user.email).toBe("test@example.com");

    // 3. Logout
    const logoutRes = await logoutRoute();
    expect(logoutRes.status).toBe(200);
    expect(authTestState.cookieJar.has("lms_session_token")).toBe(false);

    // 4. /me should now return 401
    const meRes2 = await meRoute();
    expect(meRes2.status).toBe(401);

    // 5. Login with the registered credentials
    authTestState.cookieJar.clear();
    const loginRes = await loginRoute(
      jsonRequest({ email: "test@example.com", password: "password123" }),
    );
    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.user.email).toBe("test@example.com");
    expect(authTestState.cookieJar.get("lms_session_token")).toBeTruthy();

    authTestState.testDb?.close();
  });

  it("register with invalid email returns 400", async () => {
    const res = await registerRoute(
      jsonRequest({ email: "not-an-email", password: "password123", name: "Test" }),
    );
    expect(res.status).toBe(400);

    authTestState.testDb?.close();
  });

  it("register with short password returns 400", async () => {
    const res = await registerRoute(
      jsonRequest({ email: "a@b.com", password: "short", name: "Test" }),
    );
    expect(res.status).toBe(400);

    authTestState.testDb?.close();
  });

  it("register with missing fields returns 400", async () => {
    const res = await registerRoute(
      jsonRequest({ email: "a@b.com" }),
    );
    expect(res.status).toBe(400);

    authTestState.testDb?.close();
  });

  it("duplicate registration returns 409", async () => {
    await registerRoute(
      jsonRequest({ email: "dup@test.com", password: "password123", name: "First" }),
    );
    const res = await registerRoute(
      jsonRequest({ email: "dup@test.com", password: "password456", name: "Second" }),
    );
    expect(res.status).toBe(409);

    authTestState.testDb?.close();
  });

  it("login with wrong password returns 401", async () => {
    await registerRoute(
      jsonRequest({ email: "user@test.com", password: "correct-pass", name: "User" }),
    );
    authTestState.cookieJar.clear();
    const res = await loginRoute(
      jsonRequest({ email: "user@test.com", password: "wrong-pass" }),
    );
    expect(res.status).toBe(401);

    authTestState.testDb?.close();
  });

  it("login with nonexistent email returns 401", async () => {
    const res = await loginRoute(
      jsonRequest({ email: "nobody@test.com", password: "password123" }),
    );
    expect(res.status).toBe(401);

    authTestState.testDb?.close();
  });

  it("repairs migrated anonymous conversation indexes during registration", async () => {
    const anonSessionId = "anon_seed";
    const anonUserId = seedAnonymousConversation(anonSessionId);
    authTestState.cookieJar.set("lms_anon_session", anonSessionId);

    const res = await registerRoute(
      jsonRequest({ email: "migrate@test.com", password: "password123", name: "Migrated User" }),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(repairConversationOwnershipIndex).toHaveBeenCalledWith(
      "conv_anon",
      body.user.id,
      anonUserId,
    );
    expect(authTestState.cookieJar.has("lms_anon_session")).toBe(false);

    authTestState.testDb?.close();
  });

  it("repairs migrated anonymous conversation indexes during login", async () => {
    const regRes = await registerRoute(
      jsonRequest({ email: "login-migrate@test.com", password: "password123", name: "Returning User" }),
    );
    const regBody = await regRes.json();

    const anonSessionId = "anon_login_seed";
    const anonUserId = seedAnonymousConversation(anonSessionId);
    authTestState.cookieJar.clear();
    authTestState.cookieJar.set("lms_anon_session", anonSessionId);

    const res = await loginRoute(
      jsonRequest({ email: "login-migrate@test.com", password: "password123" }),
    );

    expect(res.status).toBe(200);
    expect(repairConversationOwnershipIndex).toHaveBeenCalledWith(
      "conv_anon",
      regBody.user.id,
      anonUserId,
    );
    expect(authTestState.cookieJar.has("lms_anon_session")).toBe(false);

    authTestState.testDb?.close();
  });

  it("treats a mock-role cookie alone as anonymous", async () => {
    authTestState.cookieJar.set("lms_mock_session_role", "ADMIN");

    const user = await getSessionUser();

    expect(user.roles).toEqual(["ANONYMOUS"]);
    expect(authTestState.cookieJar.has("lms_mock_session_role")).toBe(false);

    authTestState.testDb?.close();
  });

  it("keeps role simulation as an overlay on a validated real session", async () => {
    const regRes = await registerRoute(
      jsonRequest({ email: "overlay@test.com", password: "password123", name: "Overlay User" }),
    );
    const regBody = await regRes.json();
    authTestState.cookieJar.set("lms_mock_session_role", "ADMIN");

    const user = await getSessionUser();

    expect(user.id).toBe(regBody.user.id);
    expect(user.roles).toEqual(["ADMIN"]);

    authTestState.testDb?.close();
  });

  it("clears stale session and mock cookies when session validation fails", async () => {
    await registerRoute(
      jsonRequest({ email: "stale@test.com", password: "password123", name: "Stale User" }),
    );

    authTestState.cookieJar.set("lms_session_token", "invalid-session-token");
    authTestState.cookieJar.set("lms_mock_session_role", "ADMIN");

    const user = await getSessionUser();

    expect(user.roles).toEqual(["ANONYMOUS"]);
    expect(authTestState.cookieJar.has("lms_session_token")).toBe(false);
    expect(authTestState.cookieJar.has("lms_mock_session_role")).toBe(false);

    authTestState.testDb?.close();
  });
});
