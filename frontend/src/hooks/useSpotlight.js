import { useCallback } from "react";

/**
 * useSpotlight — returns an onMouseMove handler that feeds
 * cursor position into --mx/--my custom props for .spotlight CSS.
 * Shared by Landing cards and Dashboard cards.
 */
export default function useSpotlight() {
  return (e) => {
    const el = e.currentTarget;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
}
