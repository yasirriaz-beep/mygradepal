"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

/** Global keyboard shortcuts that often copy, print, or open devtools / source. */
export default function ContentProtectionShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      // Block Ctrl/Cmd+S, P, A
      if (mod && ["s", "p", "a"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }

      // Block F12 (DevTools)
      if (e.key === "F12") {
        e.preventDefault();
      }

      // Block Ctrl/Cmd+Shift+I (DevTools)
      if (mod && e.shiftKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
      }

      // Block Ctrl/Cmd+U (view source)
      if (mod && e.key.toLowerCase() === "u") {
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return children;
}
