import { describe, expect, it } from "vitest";

import { getMediaVolumeCapacity } from "@/lib/storage/volume-capacity";

describe("media volume capacity", () => {
  it("reports available writable-volume capacity from statfs data", async () => {
    const capacity = await getMediaVolumeCapacity(
      { rootPath: "/tmp/media-volume" },
      {
        statfsImpl: async () => ({ bsize: 1024, blocks: 1000, bavail: 250 }),
        now: () => new Date("2026-04-15T12:00:00.000Z"),
      },
    );

    expect(capacity).toEqual({
      status: "available",
      checkedAt: "2026-04-15T12:00:00.000Z",
      rootPath: "/tmp/media-volume",
      totalBytes: 1024000,
      freeBytes: 256000,
      usedBytes: 768000,
      percentUsed: 75,
    });
  });

  it("returns an explicit unavailable state when statfs fails", async () => {
    const capacity = await getMediaVolumeCapacity(
      { rootPath: "/tmp/media-volume" },
      {
        statfsImpl: async () => {
          throw new Error("statfs unavailable");
        },
        now: () => new Date("2026-04-15T12:00:00.000Z"),
      },
    );

    expect(capacity).toEqual({
      status: "unavailable",
      checkedAt: "2026-04-15T12:00:00.000Z",
      rootPath: "/tmp/media-volume",
      reason: "statfs unavailable",
    });
  });

  it("fails safe when filesystem metrics are incomplete", async () => {
    const capacity = await getMediaVolumeCapacity(
      { rootPath: "/tmp/media-volume" },
      {
        statfsImpl: async () => ({ bsize: 0, blocks: 1000, bavail: 250 }),
        now: () => new Date("2026-04-15T12:00:00.000Z"),
      },
    );

    expect(capacity).toEqual({
      status: "unavailable",
      checkedAt: "2026-04-15T12:00:00.000Z",
      rootPath: "/tmp/media-volume",
      reason: "Filesystem capacity metrics were incomplete for the writable media volume.",
    });
  });
});