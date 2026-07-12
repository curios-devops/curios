import { useId } from "react";
import { useAccentColor } from "../../hooks/useAccentColor.ts";
import { useTheme } from "../theme/ThemeContext.tsx";

interface CuriosLogoProps {
  size?: number;
  className?: string;
  colorOverride?: string;
}

export default function CuriosLogo({ size = 16, className = "", colorOverride }: CuriosLogoProps) {
  const accentColor = useAccentColor();
  const { theme, accentColor: selectedAccentColor } = useTheme();
  const maskId = useId();
  const isDarkMode =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const centerColor = colorOverride ||
    (selectedAccentColor === "gray"
      ? isDarkMode
        ? "#F3F4F6"
        : "#111827"
      : accentColor.primary);

  return (
    <svg
      role="img"
      aria-label="Curios logo"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 500 500"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <mask id={maskId}>
          <rect width="500" height="500" fill="white" />
          <circle cx="80" cy="80" r="20" fill="black" />
          <circle cx="120" cy="120" r="20" fill="black" />
          <circle cx="420" cy="80" r="20" fill="black" />
          <circle cx="380" cy="120" r="20" fill="black" />
          <circle cx="120" cy="380" r="20" fill="black" />
          <circle cx="80" cy="420" r="20" fill="black" />
          <circle cx="380" cy="380" r="20" fill="black" />
          <circle cx="420" cy="420" r="20" fill="black" />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`} fill="#9A9A9A">
        <rect x="100" y="0" width="300" height="100" rx="20" />
        <rect x="0" y="100" width="100" height="300" rx="20" />
        <rect x="100" y="400" width="300" height="100" rx="20" />
        <rect x="400" y="100" width="100" height="100" rx="20" />
        <rect x="400" y="300" width="100" height="100" rx="20" />
        <polygon points="80,100 100,80 120,100 100,120" />
        <polygon points="380,100 400,80 420,100 400,120" />
        <polygon points="80,400 100,380 120,400 100,420" />
        <polygon points="380,400 400,380 420,400 400,420" />
      </g>
      <rect x="200" y="200" width="100" height="100" rx="20" fill={centerColor} />
    </svg>
  );
}
