import { useSyncExternalStore } from "react";

/**
 * Theme store (light / dark).
 *
 * - The user's explicit choice is saved ONLY when they click the toggle
 *   (key "adeycp-dark-mode": "1" = dark, "0" = light). Before that, the
 *   site follows the operating-system preference, live.
 * - index.html runs a tiny inline script before first paint that applies the
 *   same decision, so there is no flash of the wrong theme.
 * - One shared store → every toggle on the page (desktop header, mobile
 *   menu) always agrees, and the choice syncs across open tabs.
 */
const KEY = "adeycp-dark-mode";
const THEME_COLOR = { light: "#123a5c", dark: "#12162b" } as const;

const listeners = new Set<() => void>();
const mql =
  typeof window !== "undefined" ? window.matchMedia?.("(prefers-color-scheme: dark)") : undefined;

function readStored(): boolean | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? null : v === "1";
  } catch {
    return null;
  }
}

function currentIsDark(): boolean {
  const stored = readStored();
  return stored !== null ? stored : (mql?.matches ?? false);
}

function apply(dark: boolean, animate: boolean) {
  const root = document.documentElement;
  if (animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("theme-switching");
    window.setTimeout(() => root.classList.remove("theme-switching"), 250);
  }
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? THEME_COLOR.dark : THEME_COLOR.light);
}

function emit() {
  listeners.forEach((l) => l());
}

let initialised = false;
function init() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;
  apply(currentIsDark(), false);
  // Follow OS changes only while the user hasn't chosen explicitly.
  mql?.addEventListener?.("change", () => {
    if (readStored() === null) {
      apply(currentIsDark(), true);
      emit();
    }
  });
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      apply(currentIsDark(), true);
      emit();
    }
  });
}

function subscribe(cb: () => void) {
  init();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setDarkMode(dark: boolean) {
  try {
    localStorage.setItem(KEY, dark ? "1" : "0");
  } catch {
    /* private mode: still switch for this session */
  }
  apply(dark, true);
  emit();
}

export function useDarkMode() {
  const isDark = useSyncExternalStore(subscribe, currentIsDark, () => false);
  return { isDark, toggle: () => setDarkMode(!currentIsDark()), setIsDark: setDarkMode };
}
