"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const KEY = "parcha-theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Read actual DOM state — the blocking script already applied the right class
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="rounded-xl" disabled />;
  }

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem(KEY, next ? "dark" : "light"); } catch (_) {}
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-xl"
      onClick={toggle}
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
