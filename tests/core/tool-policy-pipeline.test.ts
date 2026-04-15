import { describe, expect, it } from "vitest";
import {
  applyPolicyLayers,
  type BundleResolver,
  type ToolPolicyLayer,
} from "@/core/tool-registry/ToolPolicyPipeline";

const ALL_TOOLS = ["calc", "chart", "graph", "search", "navigate", "admin_search"];

const resolver: BundleResolver = {
  expandBundleRef(ref: string): readonly string[] {
    if (!ref.startsWith("bundle:")) return [ref];
    const id = ref.slice(7);
    const bundles: Record<string, string[]> = {
      calculator: ["calc", "chart", "graph"],
      navigation: ["navigate", "admin_search"],
      search: ["search"],
    };
    return bundles[id] ?? [];
  },
};

describe("applyPolicyLayers", () => {
  it("returns all tools with no layers", () => {
    expect(applyPolicyLayers(ALL_TOOLS, [], resolver)).toEqual(ALL_TOOLS);
  });

  it("empty policy layers are no-ops", () => {
    const layers: ToolPolicyLayer[] = [
      { label: "global", policy: undefined },
      { label: "role", policy: undefined },
    ];
    expect(applyPolicyLayers(ALL_TOOLS, layers, resolver)).toEqual(ALL_TOOLS);
  });

  it("allow narrows to specified tools", () => {
    const layers: ToolPolicyLayer[] = [
      { label: "global", policy: { allow: ["calc", "search"] } },
    ];
    expect(applyPolicyLayers(ALL_TOOLS, layers, resolver)).toEqual(["calc", "search"]);
  });

  it("deny removes specified tools", () => {
    const layers: ToolPolicyLayer[] = [
      { label: "global", policy: { deny: ["admin_search"] } },
    ];
    expect(applyPolicyLayers(ALL_TOOLS, layers, resolver)).toEqual([
      "calc", "chart", "graph", "search", "navigate",
    ]);
  });

  it("deny overrides allow within the same layer", () => {
    const layers: ToolPolicyLayer[] = [
      { label: "global", policy: { allow: ["calc", "search", "chart"], deny: ["search"] } },
    ];
    expect(applyPolicyLayers(ALL_TOOLS, layers, resolver)).toEqual(["calc", "chart"]);
  });

  it("later layers can only narrow, not re-add", () => {
    const layers: ToolPolicyLayer[] = [
      { label: "global", policy: { deny: ["calc"] } },
      { label: "request", policy: { allow: ["calc", "search"] } },
    ];
    // calc was denied in global, request allow cannot re-add it
    expect(applyPolicyLayers(ALL_TOOLS, layers, resolver)).toEqual(["search"]);
  });

  it("bundle references expand correctly", () => {
    const layers: ToolPolicyLayer[] = [
      { label: "global", policy: { allow: ["bundle:calculator"] } },
    ];
    expect(applyPolicyLayers(ALL_TOOLS, layers, resolver)).toEqual(["calc", "chart", "graph"]);
  });

  it("bundle deny removes all bundle tools", () => {
    const layers: ToolPolicyLayer[] = [
      { label: "global", policy: { deny: ["bundle:calculator"] } },
    ];
    expect(applyPolicyLayers(ALL_TOOLS, layers, resolver)).toEqual([
      "search", "navigate", "admin_search",
    ]);
  });

  it("unknown bundle targets do not remove valid tools", () => {
    const layers: ToolPolicyLayer[] = [
      { label: "global", policy: { deny: ["bundle:nonexistent"] } },
    ];
    expect(applyPolicyLayers(ALL_TOOLS, layers, resolver)).toEqual(ALL_TOOLS);
  });

  it("unknown tool names in allow are silently ignored", () => {
    const layers: ToolPolicyLayer[] = [
      { label: "global", policy: { allow: ["calc", "does_not_exist"] } },
    ];
    expect(applyPolicyLayers(ALL_TOOLS, layers, resolver)).toEqual(["calc"]);
  });

  it("complete denial falls back to pre-policy set", () => {
    const layers: ToolPolicyLayer[] = [
      { label: "global", policy: { deny: ALL_TOOLS } },
    ];
    // Safety: if all tools denied, return original set
    expect(applyPolicyLayers(ALL_TOOLS, layers, resolver)).toEqual(ALL_TOOLS);
  });

  it("multi-layer cascading narrows correctly", () => {
    const layers: ToolPolicyLayer[] = [
      { label: "global", policy: { allow: ["calc", "chart", "search", "navigate"] } },
      { label: "role", policy: { deny: ["navigate"] } },
      { label: "request", policy: { allow: ["calc", "search"] } },
    ];
    expect(applyPolicyLayers(ALL_TOOLS, layers, resolver)).toEqual(["calc", "search"]);
  });

  it("multi-agent composition: different agent policies produce different sets", () => {
    const agent1Layers: ToolPolicyLayer[] = [
      { label: "agent", policy: { allow: ["bundle:calculator"] } },
    ];
    const agent2Layers: ToolPolicyLayer[] = [
      { label: "agent", policy: { allow: ["bundle:navigation"] } },
    ];
    const set1 = applyPolicyLayers(ALL_TOOLS, agent1Layers, resolver);
    const set2 = applyPolicyLayers(ALL_TOOLS, agent2Layers, resolver);
    expect(set1).toEqual(["calc", "chart", "graph"]);
    expect(set2).toEqual(["navigate", "admin_search"]);
    expect(set1).not.toEqual(set2);
  });

  it("policy precedence is deterministic across repeated calls", () => {
    const layers: ToolPolicyLayer[] = [
      { label: "global", policy: { allow: ["calc", "search", "navigate"] } },
      { label: "role", policy: { deny: ["navigate"] } },
    ];
    const r1 = applyPolicyLayers(ALL_TOOLS, layers, resolver);
    const r2 = applyPolicyLayers(ALL_TOOLS, layers, resolver);
    expect(r1).toEqual(r2);
    expect(r1).toEqual(["calc", "search"]);
  });
});
