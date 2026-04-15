import { render, renderHook } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCurrentPageMemento } from "@/hooks/chat/useCurrentPageMemento";
import type { CurrentPageMemento } from "@/lib/chat/CurrentPageMemento";

const mementoMock: CurrentPageMemento = {
  getSnapshot: vi.fn().mockReturnValue({ pathname: "/test" }),
  start: vi.fn(),
  stop: vi.fn(),
  setPathname: vi.fn(),
};

vi.mock("@/lib/chat/CurrentPageMemento", () => ({
  createCurrentPageMemento: () => mementoMock,
}));

function Harness({ pathname }: { pathname: string }) {
  useCurrentPageMemento(pathname);
  return <div>memento-harness</div>;
}

describe("useCurrentPageMemento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls start on mount and stop on unmount", () => {
    const { unmount } = render(<Harness pathname="/library" />);
    expect(mementoMock.start).toHaveBeenCalledTimes(1);
    expect(mementoMock.stop).not.toHaveBeenCalled();

    unmount();
    expect(mementoMock.stop).toHaveBeenCalledTimes(1);
  });

  it("calls setPathname with initial pathname", () => {
    render(<Harness pathname="/corpus" />);
    expect(mementoMock.setPathname).toHaveBeenCalledWith("/corpus");
  });

  it("calls setPathname when pathname changes", () => {
    const { rerender } = render(<Harness pathname="/page-a" />);
    expect(mementoMock.setPathname).toHaveBeenCalledWith("/page-a");

    rerender(<Harness pathname="/page-b" />);
    expect(mementoMock.setPathname).toHaveBeenCalledWith("/page-b");
  });

  it("returns the memento instance", () => {
    const { result } = renderHook(() => useCurrentPageMemento("/test"));
    expect(result.current).toBe(mementoMock);
  });
});
