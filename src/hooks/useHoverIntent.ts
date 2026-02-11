import { useCallback, useEffect, useRef, useState } from "react";

type UseHoverIntentOptions = {
  /** Delay before opening after hover starts (ms) */
  openDelay?: number;
  /** Delay before closing after hover ends (ms) */
  closeDelay?: number;
  /** Whether hover behavior is disabled (e.g. on mobile) */
  disabled?: boolean;
  /** Called whenever the panel closes (useful for resetting derived state) */
  onClose?: () => void;
};

type UseHoverIntentReturn = {
  open: boolean;
  pinned: boolean;
  hintVisible: boolean;
  scheduleOpen: () => void;
  scheduleClose: () => void;
  cancelScheduledOpen: () => void;
  cancelScheduledClose: () => void;
  close: () => void;
  onTriggerClick: () => void;
  setOpen: (next: boolean) => void;
};

export function useHoverIntent(options: UseHoverIntentOptions = {}): UseHoverIntentReturn {
  const { openDelay = 200, closeDelay = 120, disabled = false, onClose } = options;

  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const hoverTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  const cancelScheduledOpen = useCallback(() => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  }, []);

  const cancelScheduledClose = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const close = useCallback(() => {
    cancelScheduledOpen();
    cancelScheduledClose();
    setOpen(false);
    setPinned(false);
    setHintVisible(false);
    onClose?.();
  }, [cancelScheduledOpen, cancelScheduledClose, onClose]);

  const scheduleOpen = useCallback(() => {
    if (disabled) return;
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setHintVisible(true);
    hoverTimer.current = window.setTimeout(() => {
      setOpen(true);
      setHintVisible(false);
    }, openDelay);
  }, [disabled, openDelay]);

  const scheduleClose = useCallback(() => {
    if (disabled || pinned) return;
    cancelScheduledClose();
    closeTimer.current = window.setTimeout(() => close(), closeDelay);
  }, [cancelScheduledClose, close, disabled, pinned, closeDelay]);

  useEffect(() => {
    if (!open || disabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, disabled, close]);

  const onTriggerClick = useCallback(() => {
    if (disabled) {
      // Mobile: toggle
      if (open) close();
      else {
        setOpen(true);
        setHintVisible(false);
      }
      return;
    }
    // Desktop: click pins/unpins
    if (pinned) close();
    else {
      setPinned(true);
      setOpen(true);
      setHintVisible(false);
    }
  }, [disabled, open, pinned, close]);

  return {
    open,
    pinned,
    hintVisible,
    scheduleOpen,
    scheduleClose,
    cancelScheduledOpen,
    cancelScheduledClose,
    close,
    onTriggerClick,
    setOpen,
  };
}
