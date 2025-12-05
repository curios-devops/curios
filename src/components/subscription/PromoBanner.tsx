import { useTranslation } from '../../hooks/useTranslation';

export default function PromoBanner() {
  const { t } = useTranslation();
  
  return (
    <div className="relative w-full h-20 mb-4 overflow-hidden rounded-lg">
      {/* Christmas red background */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-900 via-red-800 to-red-900"></div>

      {/* Subtle sparkle/snow effect */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      ></div>

      {/* Main content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <div className="text-center">
          {/* Line 1: Christmas Deal */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl font-bold text-green-400">🎄</span>
            <span className="text-xl font-bold text-amber-300">{t('christmasDeal')}</span>
            <span className="text-xl font-bold text-green-400">🎄</span>
          </div>
          {/* Line 2: 50% Off */}
          <div className="text-sm font-semibold text-amber-200 mt-1">
            {t('fiftyPercentOff')}
          </div>
        </div>
      </div>

      {/* Green accent glow */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(ellipse at center, rgba(34, 197, 94, 0.4), transparent 70%)`,
        }}
      ></div>
    </div>
  );
}
