"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Locks the guest experience to light mode and restores the user's
 * theme preference when they leave the guest route.
 */
export function GuestLightTheme({ children }: { children: ReactNode }) {
  const { setTheme } = useTheme();
  const previousTheme = useRef<string>("system");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored) {
      previousTheme.current = stored;
    } else if (document.documentElement.classList.contains("dark")) {
      previousTheme.current = "dark";
    }

    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
    document.body.classList.add("guest-route");
    setTheme("light");

    return () => {
      document.body.classList.remove("guest-route");
      document.documentElement.style.colorScheme = "";

      const restore = previousTheme.current;
      if (restore && restore !== "light") {
        setTheme(restore);
      }
    };
  }, [setTheme]);

  return children;
}
