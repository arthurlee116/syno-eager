import { useEffect } from "react";

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) return false;

  const element = target instanceof Element ? target : target.parentElement;
  if (!element) return false;

  const editable = element.closest("input, textarea, [contenteditable]");
  if (!editable) return false;

  if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
    return !editable.readOnly && !editable.disabled;
  }

  if (!(editable instanceof HTMLElement)) return false;
  if (typeof editable.isContentEditable === "boolean") return editable.isContentEditable;

  const contentEditableAttr = editable.getAttribute("contenteditable");
  return contentEditableAttr !== null && contentEditableAttr.toLowerCase() !== "false";
}

export function usePlainTextCopy(): void {
  useEffect(() => {
    const onCopy = (event: ClipboardEvent) => {
      if (isEditableElement(event.target)) return;

      const selection = window.getSelection();
      const text = selection?.toString() ?? "";

      if (text.trim().length === 0) return;
      if (!event.clipboardData) return;

      event.preventDefault();
      event.clipboardData.setData("text/plain", text);
    };

    document.addEventListener("copy", onCopy);
    return () => document.removeEventListener("copy", onCopy);
  }, []);
}

export { isEditableElement };
