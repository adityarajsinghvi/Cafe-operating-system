"use client";

import { useEffect, useRef, type ReactNode } from "react";

const KEY = "parcha-theme";

export function GuestLightTheme({ children }: { children: ReactNode }) {
  const wasDark = useRef(false);

  useEffect(() => {
    // Remember whether the owner had dark mode on before entering guest view
    wasDark.current = document.documentElement.classList.contains("dark");

    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
    document.body.classList.add("guest-route");

    return () => {
      document.body.classList.remove("guest-route");
      document.documentElement.style.colorScheme = "";

      // Restore dark mode if it was active before
      if (wasDark.current) {
        document.documentElement.classList.add("dark");
      }
    };
  }, []);

  return children;
}
