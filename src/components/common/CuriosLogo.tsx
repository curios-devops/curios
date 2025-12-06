import { useAccentColor } from "../../hooks/useAccentColor.ts";

interface CuriosLogoProps {
  size?: number;
  className?: string;
}

export default function CuriosLogo({ size = 16, className = "" }: CuriosLogoProps) {
  const accentColor = useAccentColor();
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="-150 -150 300 300" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Center circle (radius 34) */}
      <circle cx="0" cy="0" r="34" fill={accentColor.primary}/>

      {/* Define smooth 34px cut in the outer ring */}
      <defs>
        <mask id={`ringMask-${size}`}>
          {/* Full canvas */}
          <rect x="-150" y="-150" width="300" height="300" fill="white"/>

          {/* Smooth cut: capsule shape 34px tall */}
          <path d="
            M 0 -17
            H 200
            A 17 17 0 0 1 200 17
            H 0
            A 17 17 0 0 1 0 -17
            Z"
            fill="black"/>
        </mask>
      </defs>

      {/* Outer ring (inner 68, outer 102, stroke 34) */}
      <circle 
        cx="0" 
        cy="0" 
        r="85"
        fill="none"
        stroke={accentColor.primary}
        strokeWidth="34"
        mask={`url(#ringMask-${size})`}
      />
    </svg>
  );
}
