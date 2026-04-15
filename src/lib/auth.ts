import { cookies } from "next/headers";
import { getDb } from "./db";
import { getUserDataMapper } from "../adapters/RepositoryFactory";
import { SessionDataMapper } from "../adapters/SessionDataMapper";
import { BcryptHasher } from "../adapters/BcryptHasher";
import { RegisterUserInteractor } from "../core/use-cases/RegisterUserInteractor";
import { AuthenticateUserInteractor } from "../core/use-cases/AuthenticateUserInteractor";
import { ValidateSessionInteractor } from "../core/use-cases/ValidateSessionInteractor";
import { LoggingDecorator } from "../core/common/LoggingDecorator";
import type { RoleName, User as SessionUser } from "../core/entities/user";
import type { AuthResult } from "../core/use-cases/RegisterUserInteractor";

export type { RoleName, SessionUser, AuthResult };

// ── Composition root: wire interactors to concrete adapters ──

function getAuthInteractors() {
  // getDb() approved: raw SQL query — see data-access-canary.test.ts (Sprint 9)
  const db = getDb();
  const userRepo = getUserDataMapper();
  const sessionRepo = new SessionDataMapper(db);
  const hasher = new BcryptHasher();

  return {
    register: new LoggingDecorator(
      new RegisterUserInteractor(userRepo, hasher, sessionRepo),
      "RegisterUser",
    ),
    authenticate: new LoggingDecorator(
      new AuthenticateUserInteractor(userRepo, hasher, sessionRepo),
      "AuthenticateUser",
    ),
    validateSession: new LoggingDecorator(
      new ValidateSessionInteractor(sessionRepo, userRepo),
      "ValidateSession",
    ),
    sessionRepo,
  };
}

// ── New auth convenience functions ──

export async function register(input: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthResult> {
  const { register: interactor } = getAuthInteractors();
  return interactor.execute(input);
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const { authenticate } = getAuthInteractors();
  return authenticate.execute(input);
}

export async function logout(sessionToken: string): Promise<void> {
  const { sessionRepo } = getAuthInteractors();
  await sessionRepo.delete(sessionToken);
}

export async function validateSession(
  token: string,
): Promise<SessionUser> {
  const { validateSession: interactor, sessionRepo } = getAuthInteractors();
  const user = await interactor.execute({ token });

  // Opportunistic expired-session prune (~1% of requests)
  if (Math.random() < 0.01) {
    sessionRepo.deleteExpired().catch(() => {});
  }

  return user;
}

// ── Session cookie constants ──

const SESSION_COOKIE_NAME = "lms_session_token";
const MOCK_SESSION_COOKIE_NAME = "lms_mock_session_role";

const ANONYMOUS_USER: SessionUser = {
  id: "usr_anonymous",
  email: "anonymous@example.com",
  name: "Anonymous User",
  roles: ["ANONYMOUS"],
};

function tryDeleteCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  name: string,
) {
  try {
    cookieStore.delete(name);
  } catch {
    // `getSessionUser()` also runs in read-only request contexts like layouts.
  }
}

function clearStaleAuthCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) {
  tryDeleteCookie(cookieStore, SESSION_COOKIE_NAME);
  tryDeleteCookie(cookieStore, MOCK_SESSION_COOKIE_NAME);
}

/**
 * Resolves the current user from the session.
 * 1. Try real session token (lms_session_token cookie → ValidateSessionInteractor)
 * 2. Optionally overlay a simulated role on a validated real session
 * 3. Default to ANONYMOUS
 */
export async function getSessionUser(): Promise<SessionUser> {
  const cookieStore = await cookies();

  // Check for simulation role override (set via /api/auth/switch)
  const mockRole = cookieStore.get(MOCK_SESSION_COOKIE_NAME)?.value as
    | RoleName
    | undefined;

  // 1. Try real session token first
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken) {
    try {
      const realUser = await validateSession(sessionToken);

      // If a simulation role is active, overlay it onto the real identity
      if (mockRole && mockRole !== realUser.roles[0]) {
        return { ...realUser, roles: [mockRole] };
      }

      return realUser;
    } catch {
      clearStaleAuthCookies(cookieStore);
      return ANONYMOUS_USER;
    }
  }

  if (mockRole) {
    tryDeleteCookie(cookieStore, MOCK_SESSION_COOKIE_NAME);
  }

  // 3. Default to ANONYMOUS
  return ANONYMOUS_USER;
}

/**
 * Sets a mock session cookie for the role simulation system.
 * This is only a role overlay and never a standalone auth mechanism.
 */
export async function setMockSession(role: RoleName) {
  const cookieStore = await cookies();
  cookieStore.set(MOCK_SESSION_COOKIE_NAME, role, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Helper to block access if the user lacks the required RBAC role.
 */
export async function requireRole(allowedRoles: RoleName[]) {
  const user = await getSessionUser();
  const hasAccess = user.roles.some((role) => allowedRoles.includes(role));

  if (!hasAccess) {
    throw new Error(
      `Unauthorized. Requires one of: ${allowedRoles.join(", ")}`,
    );
  }
}
