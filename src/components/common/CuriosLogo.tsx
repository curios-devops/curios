import { useEffect, useId, useRef, useState } from "react";
import { useAccentColor } from "../../hooks/useAccentColor.ts";
import { useTheme } from "../theme/ThemeContext.tsx";

interface CuriosLogoProps {
  size?: number;
  className?: string;
  colorOverride?: string;
  frameColor?: string; // outer frame fill (app-settings.md → LOGO_ICON_COLOR)
  pulse?: boolean; // center square slowly breathes (LOGO_DOT_PULSE)
  ping?: boolean; // radar ping like Search's "sources" dot: a 40% copy grows ×2 and fades (big Home mark)
  eyes?: boolean; // the center square becomes two eyes that look at the pointer and blink (big Home mark)
}

// Eyes: how far (viewBox units) they move toward the pointer, and the distance (px) at which
// they reach it.
const EYE_TRAVEL = 30;
const EYE_REACH_PX = 240;

/** Offset (viewBox units) for eyes looking at the pointer, relative to the logo's center. */
function useLookAt(enabled: boolean) {
  const ref = useRef<SVGSVGElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy) || 1;
        const k = (Math.min(dist, EYE_REACH_PX) / EYE_REACH_PX) * EYE_TRAVEL / dist;
        setLook({ x: dx * k, y: dy * k });
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(frame); };
  }, [enabled]);
  return { ref, look };
}

export default function CuriosLogo({ size = 16, className = "", colorOverride, frameColor = "#9A9A9A", pulse = false, ping = false, eyes = false }: CuriosLogoProps) {
  const { ref, look } = useLookAt(eyes);
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
      ref={ref}
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
      <g mask={`url(#${maskId})`} fill={frameColor}>
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
      {eyes ? (
        // Two eyes in place of the square: they follow the pointer and blink now and then.
        <g style={{ transform: `translate(${look.x}px, ${look.y}px)`, transition: "transform 120ms ease-out" }}>
          <g className="logo-eyes-blink">
            <rect x="207" y="215" width="34" height="70" rx="17" fill={centerColor} />
            <rect x="259" y="215" width="34" height="70" rx="17" fill={centerColor} />
          </g>
        </g>
      ) : (
        <>
          {ping && <rect x="200" y="200" width="100" height="100" rx="20" fill={centerColor} className="logo-dot-ping" />}
          <rect x="200" y="200" width="100" height="100" rx="20" fill={centerColor} className={pulse && !ping ? "logo-dot-pulse" : undefined} />
        </>
      )}
    </svg>
  );
}
