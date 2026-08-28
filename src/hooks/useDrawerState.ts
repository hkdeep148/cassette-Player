import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "cassette-web-drawer-open";
const FIRST_VISIT_KEY = "cassette-web-visited";

export function useDrawerState() {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    const isFirstVisit = !localStorage.getItem(FIRST_VISIT_KEY);
    if (isFirstVisit) return true; // Open on first visit

    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    localStorage.setItem(FIRST_VISIT_KEY, "true");
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isOpen));
  }, [isOpen]);

  const toggle = useCallback(() => setIsOpen((o) => !o), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, toggle, open, close };
}