import { createElement, type ImgHTMLAttributes } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
    const imageProps = { ...props };
    delete imageProps.priority;
    return createElement("img", { ...imageProps, alt: props.alt ?? "" });
  },
}));

import { MarkdownProse } from "@/components/MarkdownProse";

describe("MarkdownProse journal variant", () => {
  it("renders pull quotes, side notes, and figure variants for journal articles", () => {
    const { container } = render(
      <MarkdownProse
        variant="journal"
        content={[
          "> Pull quote: Systems become legible when the interface stops shouting.",
          "",
          "> Side note: Keep the archive navigable by year and by type.",
          "",
          '![Archive shelf](/figure.jpg "variant=inset | Archive shelf, inset figure")',
        ].join("\n")}
      />,
    );

    expect(screen.getByText("Systems become legible when the interface stops shouting.")).toBeInTheDocument();
    expect(screen.getByText("Side note")).toBeInTheDocument();
    expect(screen.getByText("Keep the archive navigable by year and by type.")).toBeInTheDocument();
    expect(screen.getByAltText("Archive shelf")).toBeInTheDocument();
    expect(screen.getByText("Archive shelf, inset figure")).toBeInTheDocument();
    expect(container.querySelector('[data-journal-role="pullquote"]')).not.toBeNull();
    expect(container.querySelector('[data-journal-role="sidenote"]')).not.toBeNull();
  });
});