// @vitest-environment jsdom

import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WebSearchResultCard } from "./WebSearchResultCard";

describe("WebSearchResultCard", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders an initial result payload without issuing a fetch", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <WebSearchResultCard
        query="ordo site architecture"
        model="gpt-5"
        initialResult={{
          answer: "Studio Ordo uses a registry-backed chat rendering pipeline.",
          citations: [
            {
              url: "https://example.com/architecture",
              title: "Architecture Notes",
              start_index: 0,
              end_index: 10,
            },
          ],
          sources: ["https://example.com/architecture"],
          model: "gpt-5",
        }}
      />,
    );

    expect(screen.getByText("Studio Ordo uses a registry-backed chat rendering pipeline.")).toBeInTheDocument();
    expect(screen.getByText("Architecture Notes")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders an initial error payload without issuing a fetch", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <WebSearchResultCard
        query="ordo site architecture"
        model="gpt-5"
        initialError="Rate limited"
      />,
    );

    expect(screen.getByText("Rate limited", { selector: "p" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders a structured success payload returned by the compatibility route", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        action: "admin_web_search",
        query: "ordo site architecture",
        model: "gpt-5",
        answer: "A sourced answer.",
        citations: [
          {
            url: "https://example.com/architecture",
            title: "Architecture Notes",
            start_index: 0,
            end_index: 10,
          },
        ],
        sources: ["https://example.com/architecture"],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <WebSearchResultCard
        query="ordo site architecture"
        model="gpt-5"
      />,
    );

    expect(await screen.findByText("A sourced answer.")).toBeInTheDocument();
    expect(screen.getByText("Architecture Notes")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("renders a structured error payload returned by the compatibility route", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        action: "admin_web_search",
        query: "ordo site architecture",
        model: "gpt-5",
        error: "Web search is restricted to administrators.",
        code: 403,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <WebSearchResultCard
        query="ordo site architecture"
        model="gpt-5"
      />,
    );

    expect(
      await screen.findByText("Web search is restricted to administrators.", { selector: "p" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});