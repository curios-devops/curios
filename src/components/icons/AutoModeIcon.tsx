// The Auto mode icon: lucide's Rocket, or — on the Space theme — the new Tesla Roadster (one color,
// drawn on lucide's 24×24 grid and stroke so it sits with the other icons).
import { Rocket, type LucideProps } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

export function RoadsterIcon({ size = 24, strokeWidth = 2, color = 'currentColor', ...rest }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {/* Traced from the 2026 Roadster's side profile (faceted wedge: low pointed nose, long
          windshield, flat roof, sloping deck, cut-off tail), facing right. */}
      <g transform="matrix(-1 0 0 1 24 0)">
        <path d="M3.1 13.45H1V12.1L5.9 10.5L10.5 8.8H14.7L21.3 9.8L23 10.2V13.2L21.5 13.45" />
        <path d="M7.3 13.45H17.3" />
        <circle cx="5.2" cy="13.2" r="2.1" />
        <circle cx="19.4" cy="13.2" r="2.1" />
      </g>
    </svg>
  );
}

export default function AutoModeIcon(props: LucideProps) {
  const { accentColor } = useTheme();
  return accentColor === 'space' ? <RoadsterIcon {...props} /> : <Rocket {...props} />;
}
