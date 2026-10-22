import { useEffect, useState } from "react";
import { Sun, Moon, Leaf, Zap, Snowflake } from "lucide-react";

const ORDER = ["light", "dark", "solar-punk", "cyberpunk", "nordic"];

const META = {
  light: { label: "Civic Emerald", Icon: Sun },
  dark: { label: "Night", Icon: Moon },
  "solar-punk": { label: "Solar Punk", Icon: Leaf },
  cyberpunk: { label: "Cyber Ops", Icon: Zap },
  nordic: { label: "Nordic Glass", Icon: Snowflake },
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute("data-theme") || "light",
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    const scheme =
      theme === "dark" || theme === "cyberpunk" || theme === "nordic"
        ? "dark"
        : "light";
    document.documentElement.style.colorScheme = scheme;
  }, [theme]);

  function cycle() {
    const idx = Math.max(0, ORDER.indexOf(theme));
    const next = ORDER[(idx + 1) % ORDER.length];
    setTheme(next);
    try {
      localStorage.setItem("pw-theme", next);
    } catch (e) {}
  }

  const current = META[theme] || META.light;
  const next = META[ORDER[(Math.max(0, ORDER.indexOf(theme)) + 1) % ORDER.length]];
  const CurrentIcon = current.Icon;

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={cycle}
      aria-label={`Current theme: ${current.label}. Switch to ${next.label}`}
      title={`Theme: ${current.label} — click for ${next.label}`}
    >
      <CurrentIcon size={20} />
    </button>
  );
}
