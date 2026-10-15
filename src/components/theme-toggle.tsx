"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { applyThemeColor } from "@/lib/theme-color";

const STORAGE_KEY = "theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const isDark = () => document.documentElement.classList.contains("dark");

/** Switches between the dark and light theme by toggling `.dark` on <html>; the choice is kept in localStorage. */
export function ThemeToggle({ className }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => true);

  function toggle() {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    applyThemeColor(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Storage can be unavailable (private mode); the choice then lasts for this visit only.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      onClick={toggle}
      aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
    >
      {dark ? <SunIcon aria-hidden /> : <MoonIcon aria-hidden />}
      <span className="hidden md:inline">{dark ? "Tema claro" : "Tema escuro"}</span>
    </Button>
  );
}
