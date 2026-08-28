import { useState, useCallback, useRef, useEffect } from "react";

const DEFAULT_DISPLAY_MS = 2000;

export function useDeckStatus() {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const showStatus = useCallback(
    (message: string, durationMs: number = DEFAULT_DISPLAY_MS) => {
      // Clear any pending timeout
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      setStatusMessage(message);

      // Auto-clear after duration
      timeoutRef.current = window.setTimeout(() => {
        setStatusMessage(null);
        timeoutRef.current = null;
      }, durationMs);
    },
    []
  );

  const clearStatus = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatusMessage(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    statusMessage,
    showStatus,
    clearStatus,
  };
}