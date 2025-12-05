import { useAccentColor } from '../../hooks/useAccentColor';

export default function BlackFridayBanner() {
  const accentColor = useAccentColor();

  return (
    <div className="relative w-full h-24 mb-6 overflow-hidden rounded-lg">
      {/* Dark background */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-black to-gray-900"></div>

      {/* Diagonal stripe pattern - animated background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255, 255, 255, 0.1) 10px,
            rgba(255, 255, 255, 0.1) 20px
          )`,
          animation: 'slideStripes 20s linear infinite',
        }}
      ></div>

      {/* Main content - centered text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <div className="text-center">
          {/* First line: "Black Friday Last Deal" */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <span
              className="text-3xl font-bold"
              style={{ color: accentColor.primary }}
            >
              BLACK
            </span>
            <span className="text-3xl font-bold text-white">FRIDAY</span>
          </div>

          {/* Second line: "Last Deal 90% Off" */}
          <div className="text-base font-semibold text-gray-300">
            Last Deal 90% Off
          </div>
        </div>
      </div>

      {/* Subtle glow effect */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background: `radial-gradient(circle at center, ${accentColor.primary}, transparent)`,
        }}
      ></div>

      {/* CSS Animation in style tag */}
      <style>{`
        @keyframes slideStripes {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(30px);
          }
        }
      `}</style>
    </div>
  );
}
