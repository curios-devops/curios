/**
 * Cinematic Configuration
 * Centralized config for video generation system
 */

export type Engine = 'STOCK' | 'LTX' | 'WAN' | 'VEO';
export type VideoState = 'Preview' | 'Draft' | 'Enhanced' | 'Quality';

export interface CinematicConfig {
  // Timeouts
  veoTimeoutMs: number;
  wanTimeoutMs: number;
  ltxTimeoutMs: number;

  // Feature flags
  ltxEnabled: boolean;
  wanEnabled: boolean;
  veoEnabled: boolean;

  // VEO triggers
  engagementThresholdMs: number;

  // Scoring thresholds
  stockPassThreshold: number;    // > 0.8 → usar STOCK directo
  wanScoreThreshold: number;     // > 0.7 → usar WAN
  ltxScoreThreshold: number;     // > 0.4 → usar LTX
  veoUpgradeThreshold: number;   // > 0.85 → intentar VEO async

  // Concurrency limits
  maxConcurrentLtx: number;
  maxConcurrentWan: number;
  maxConcurrentVeo: number;
}

/**
 * Default configuration based on architecture v3
 */
export const DEFAULT_CONFIG: CinematicConfig = {
  // Timeouts (ms)
  veoTimeoutMs: 60000,      // 60s para VEO (max time to wait for async upgrades)
  wanTimeoutMs: 15000,      // 15s para WAN (ultra-fast)
  ltxTimeoutMs: 5000,       // 5s para LTX (rápido)

  // Feature flags
  ltxEnabled: false,        // 🚨 API no conectada
  wanEnabled: false,        // 🚨 API key comentada por ahora
  veoEnabled: true,         // ✅ VEO disponible

  // VEO triggers
  engagementThresholdMs: 5000, // 5s de engagement para disparar VEO

  // Scoring thresholds
  stockPassThreshold: 0.8,
  wanScoreThreshold: 0.7,
  ltxScoreThreshold: 0.4,
  veoUpgradeThreshold: 0.85,

  // Concurrency limits
  maxConcurrentLtx: 2,
  maxConcurrentWan: 2,
  maxConcurrentVeo: 1,
};

/**
 * Mapping de engine a estado UX (perceptual rendering)
 */
export const ENGINE_TO_STATE: Record<Engine, VideoState> = {
  STOCK: 'Preview',   // t=0s   - Preview inmediato (stock)
  LTX: 'Draft',       // t=1-5s - Draft rápido (LTX)
  WAN: 'Enhanced',    // t=5-15s - Enhanced (WAN)
  VEO: 'Quality',     // t=20-40s - Quality (VEO async upgrade)
};

/**
 * Obtiene el estado del video basado en los engines usados
 * Prioridad: VEO > WAN > LTX > STOCK
 */
export function getVideoState(engines: Engine[]): VideoState {
  if (engines.includes('VEO')) return 'Quality';
  if (engines.includes('WAN')) return 'Enhanced';
  if (engines.includes('LTX')) return 'Draft';
  return 'Preview';
}
