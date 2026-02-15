import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { isEditableElement, usePlainTextCopy } from "@/hooks/usePlainTextCopy";

function HookHost() {
  usePlainTextCopy();
  return <div>host</div>;
}

function createClipboardEvent() {
  const setData = vi.fn();
  const event = new Event("copy", { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, "clipboardData", {
    value: { setData },
    configurable: true,
  });
  return { event, setData };
}

describe("usePlainTextCopy", () => {
  it("intercepts copy on non-editable content and writes plain text", () => {
    const selectionSpy = vi
      .spyOn(window, "getSelection")
      .mockReturnValue({ toString: () => "The perfect word" } as Selection);

    render(<HookHost />);

    const source = document.createElement("div");
    source.textContent = "copy source";
    document.body.appendChild(source);

    const { event, setData } = createClipboardEvent();
    source.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(setData).toHaveBeenCalledWith("text/plain", "The perfect word");
    expect(setData).toHaveBeenCalledTimes(1);

    source.remove();
    selectionSpy.mockRestore();
  });

  it("does not intercept copy in editable areas", () => {
    const selectionSpy = vi
      .spyOn(window, "getSelection")
      .mockReturnValue({ toString: () => "query" } as Selection);

    render(<HookHost />);

    const input = document.createElement("input");
    input.value = "query";
    document.body.appendChild(input);

    const { event, setData } = createClipboardEvent();
    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(setData).not.toHaveBeenCalled();

    input.remove();
    selectionSpy.mockRestore();
  });

  it("treats contenteditable as editable", () => {
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    const child = document.createElement("span");
    editable.appendChild(child);
    document.body.appendChild(editable);

    expect(isEditableElement(child)).toBe(true);

    editable.remove();
  });
});
