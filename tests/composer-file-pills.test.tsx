import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ComposerFilePills } from "@/frameworks/ui/ComposerFilePills";

function createFile(name: string, type: string): File {
  return new File(["content"], name, { type });
}

describe("ComposerFilePills", () => {
  it("CCH-T370: renders file pills with data attribute when files are provided", () => {
    const files = [
      createFile("report.pdf", "application/pdf"),
      createFile("notes.txt", "text/plain"),
    ];

    const { container } = render(
      <ComposerFilePills files={files} onRemove={vi.fn()} />,
    );

    const wrapper = container.querySelector('[data-chat-file-pills="true"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelectorAll(".ui-chat-file-pill")).toHaveLength(2);
  });

  it("CCH-T375: renders null when files array is empty", () => {
    const { container } = render(
      <ComposerFilePills files={[]} onRemove={vi.fn()} />,
    );

    expect(container.querySelector('[data-chat-file-pills="true"]')).toBeNull();
  });

  it("displays file names in pills", () => {
    const files = [createFile("document.pdf", "application/pdf")];

    render(<ComposerFilePills files={files} onRemove={vi.fn()} />);

    expect(screen.getByText("document.pdf")).toBeInTheDocument();
  });

  it("calls onRemove with the correct index when remove button is clicked", () => {
    const onRemove = vi.fn();
    const files = [
      createFile("first.pdf", "application/pdf"),
      createFile("second.txt", "text/plain"),
    ];

    render(<ComposerFilePills files={files} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove second.txt" }));
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it("shows PDF icon for PDF files", () => {
    const files = [createFile("doc.pdf", "application/pdf")];

    const { container } = render(
      <ComposerFilePills files={files} onRemove={vi.fn()} />,
    );

    expect(container.textContent).toContain("📄");
  });

  it("shows text icon for plain text files", () => {
    const files = [createFile("notes.txt", "text/plain")];

    const { container } = render(
      <ComposerFilePills files={files} onRemove={vi.fn()} />,
    );

    expect(container.textContent).toContain("📝");
  });
});
