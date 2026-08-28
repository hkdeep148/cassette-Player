import { useState, useCallback, useRef, useEffect } from "react";

export type LidState = "closed" | "opening" | "open" | "closing";

export function useLidState() {
  const [lidState, setLidState] = useState<LidState>("closed");
  const isTransitioning = useRef(false);

  useEffect(() => {
    isTransitioning.current =
      lidState === "opening" || lidState === "closing";
  }, [lidState]);

  const toggleLid = useCallback(() => {
    if (isTransitioning.current) {
      console.log("⏸ Lid is transitioning — ignoring click");
      return;
    }

    setLidState((current) => {
      if (current === "closed") return "opening";
      if (current === "open") return "closing";
      return current;
    });
  }, []);

  // ⭐ NEW: Set lid to "open" state INSTANTLY (skip opening animation)
  const setLidOpenInstantly = useCallback(() => {
    isTransitioning.current = false;
    setLidState("open");
  }, []);

  // ⭐ NEW: Force close (bypasses transition check)
  const forceCloseLid = useCallback(() => {
    isTransitioning.current = false;
    setLidState("closing");
  }, []);

  const handleOpenAnimationEnd = useCallback(() => {
    setLidState("open");
  }, []);

  const handleCloseAnimationEnd = useCallback(() => {
    setLidState("closed");
  }, []);

  return {
    lidState,
    toggleLid,
    setLidOpenInstantly,
    forceCloseLid,
    handleOpenAnimationEnd,
    handleCloseAnimationEnd,
    isOpen: lidState === "open",
    isClosed: lidState === "closed",
    isAnimating: lidState === "opening" || lidState === "closing",
  };
}