import { useAccentColor } from "../../hooks/useAccentColor.ts";
import { useId } from "react";

interface CuriosLogoProps {
  size?: number;
  className?: string;
}

export default function CuriosLogo({ size = 16, className = "" }: CuriosLogoProps) {
  const accentColor = useAccentColor();
  const maskId = useId();
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="-500 -500 1000 1000"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Mask: white = visible, black = removed */}
      <mask id={maskId}>
        <rect x="-500" y="-500" width="1000" height="1000" fill="white"/>
        {/* Extended rectangular cut for a clean full-width removal */}
        <rect x="214" y="-50" width="220" height="100" fill="black"/>
      </mask>

      {/* Donut */}
      <path
        d="
          M 414 0
          A 414 414 0 1 1 -414 0
          A 414 414 0 1 1 414 0
          Z

          M 234 0
          A 234 234 0 1 0 -234 0
          A 234 234 0 1 0 234 0
          Z
        "
        fill={accentColor.primary}
        fillRule="evenodd"
        mask={`url(#${maskId})`}
      />

      {/* Center circle */}
      <circle cx="0" cy="0" r="134" fill={accentColor.primary}/>
    </svg>
  );
}
