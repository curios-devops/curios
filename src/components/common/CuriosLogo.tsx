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
  const isDarkMode =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const logoColor = colorOverride ||
    (selectedAccentColor === "gray"
      ? isDarkMode
        ? "#F3F4F6"
        : "#111827"
      : accentColor.primary);

  return (
    <span
      role="img"
      aria-label="Curios logo"
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: "inline-block",
        backgroundColor: logoColor,
        WebkitMaskImage: "url(/curios-square-logo.svg)",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "contain",
        maskImage: "url(/curios-square-logo.svg)",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "contain",
      }}
    />
  );
}
