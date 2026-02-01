"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional accessible label for the dialog */
  ariaLabel?: string;
};

/**
 * FullscreenPortal
 * - Renders children into a fixed fullscreen overlay
 * - ESC closes
 * - Click on backdrop closes
 * - Locks body scroll while open
 */
export default function FullscreenPortal({
  isOpen,
  onClose,
  children,
  ariaLabel = "Fullscreen view",
}: Props) {
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);

  // Create a stable portal root ONCE per component instance.
  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-plutus-portal", "fullscreen");
    document.body.appendChild(el);
    setPortalEl(el);

    return () => {
      try {
        document.body.removeChild(el);
      } catch {
        // ignore
      }
      setPortalEl(null);
    };
  }, []);

  // ESC to close.
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll.
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !portalEl) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Content */}
      <div className="absolute inset-0">
        <div className="relative flex h-full w-full flex-col border border-neutral-800 bg-neutral-950/70 shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_0_40px_rgba(168,85,247,0.12)]">
          {/* Top bar */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-neutral-800/70 bg-neutral-950/70 px-4 py-2 backdrop-blur">
            <div className="text-xs text-neutral-400">Fullscreen</div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-1 text-xs text-neutral-200 hover:bg-neutral-900"
            >
              Close
            </button>
          </div>

          <div className="flex-1 w-full overflow-hidden">
            <div className="h-full w-full">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>,
    portalEl
  );
}
