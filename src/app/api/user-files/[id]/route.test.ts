import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/user-files/[id]/route";

const {
  getSessionUserMock,
  findByIdMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  findByIdMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({})),
}));

vi.mock("node:fs", () => ({
  default: {
    readFileSync: vi.fn(() => Buffer.from("fake-video-content")),
    existsSync: vi.fn(() => true),
  },
}));

vi.mock("@/adapters/UserFileDataMapper", () => ({
  UserFileDataMapper: vi.fn(function MockUserFileDataMapper() {
    return {
      findById: findByIdMock,
    };
  }),
}));

vi.mock("@/lib/user-files", () => ({
  UserFileSystem: vi.fn(function MockUserFileSystem() {
    return {
      getById: findByIdMock,
    };
  }),
}));

vi.mock("@/lib/chat/resolve-user", () => ({
  resolveUserId: vi.fn(async () => ({ userId: "usr_1" })),
}));

describe("GET /api/user-files/[id]", () => {
  beforeEach(() => {
    getSessionUserMock.mockResolvedValue({ id: "usr_1", roles: ["AUTHENTICATED"] });
  });

  it("returns 404 when the file is not found", async () => {
    findByIdMock.mockResolvedValue(null);

    const req = new Request("http://localhost/api/user-files/not-found");
    const res = await GET(req, { params: Promise.resolve({ id: "not-found" }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.errorCode).toBe("NOT_FOUND");
  });

  it("returns 403 when the file belongs to a different user", async () => {
    findByIdMock.mockResolvedValue({
      file: { userId: "other_user", mimeType: "video/mp4", fileSize: 1024 },
      diskPath: "/tmp/video.mp4",
    });

    const req = new Request("http://localhost/api/user-files/asset-owned-by-other");
    const res = await GET(req, { params: Promise.resolve({ id: "asset-owned-by-other" }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.errorCode).toBe("FORBIDDEN");
  });

  it("returns the file with correct Content-Type when the user owns it", async () => {
    findByIdMock.mockResolvedValue({
      file: { userId: "usr_1", mimeType: "video/mp4", fileSize: 18 },
      diskPath: "/tmp/video.mp4",
    });

    const req = new Request("http://localhost/api/user-files/my-video");
    const res = await GET(req, { params: Promise.resolve({ id: "my-video" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("video/mp4");
    expect(res.headers.get("Cache-Control")).toMatch(/private/);
  });
});
