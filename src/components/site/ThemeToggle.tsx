import { Moon, Sun } from "lucide-react";
import { useDarkMode } from "@/lib/dark-mode";

/** Icon button showing the CURRENT theme (sun = light, moon = dark); its
 * label describes the action. Same 36px height as the other header controls. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { isDark, toggle } = useDarkMode();
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`btn-icon relative overflow-hidden ${className}`}
    >
      <Sun
        aria-hidden
        className={`absolute h-[1.05rem] w-[1.05rem] transition-all duration-200 motion-reduce:transition-none ${
          isDark ? "-rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        aria-hidden
        className={`absolute h-[1.05rem] w-[1.05rem] transition-all duration-200 motion-reduce:transition-none ${
          isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0"
        }`}
      />
    </button>
  );
}
