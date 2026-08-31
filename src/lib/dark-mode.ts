import { useEffect, useState } from "react";

const KEY = "adeycp-dark-mode";

function getInitial(): boolean {
  const stored = localStorage.getItem(KEY);
  if (stored !== null) return stored === "1";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => (typeof window !== "undefined" ? getInitial() : false));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem(KEY, isDark ? "1" : "0");
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((v) => !v), setIsDark };
}
