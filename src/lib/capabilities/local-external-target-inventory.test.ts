import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  getCanonicalLocalExternalTargetInventory,
  getLocalNativeProcessTarget,
} from "./local-external-target-inventory";

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const TSX_BINARY = path.join(
  PROJECT_ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx",
);

describe("local-external-target-inventory", () => {
  it("exposes the canonical local native target for compose_media", () => {
    expect(getLocalNativeProcessTarget("compose_media")).toEqual({
      capabilityName: "compose_media",
      runtimeKind: "native_process",
      processId: "compose-media-native",
      command: TSX_BINARY,
      args: ["scripts/compose-media-native-target.ts"],
      cwd: PROJECT_ROOT,
      entrypoint: "scripts/compose-media-native-target.ts",
      label: "Compose media native worker",
    });
  });

  it("returns a stable canonical inventory for local external targets", () => {
    expect(getCanonicalLocalExternalTargetInventory()).toEqual([
      {
        capabilityName: "compose_media",
        runtimeKind: "native_process",
        processId: "compose-media-native",
        command: TSX_BINARY,
        args: ["scripts/compose-media-native-target.ts"],
        cwd: PROJECT_ROOT,
        entrypoint: "scripts/compose-media-native-target.ts",
        label: "Compose media native worker",
      },
    ]);
  });
});