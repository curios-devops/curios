/**
 * Engine Selector
 * Decides which video generation engine to use based on scores
 * Key principle: Decision made UPFRONT (no unnecessary replacements)
 */

import { Engine, CinematicConfig } from '../config/CinematicConfig';
import { logger } from '../../../utils/logger';

export class EngineSelector {
  constructor(private config: CinematicConfig) {}

  /**
   * Selecciona el motor base upfront (decisión única por escena)
   * Basado en arquitectura v3: decisión upfront, no cadena de reemplazos
   *
   * Lógica:
   * 1. STOCK > 0.8 → usar STOCK directo (suficientemente bueno)
   * 2. No hay APIs → STOCK fallback
   * 3. Score > 0.7 + WAN disponible → WAN
   * 4. Score > 0.4 + LTX disponible → LTX
   * 5. Default → STOCK
   *
   * @param stockScore - Calidad del stock clip (0-1)
   * @param sceneScore - Score compuesto de la escena (0-1)
   * @returns Engine to use
   */
  selectBaseEngine(stockScore: number, sceneScore: number): Engine {
    logger.debug('[EngineSelector] Selecting base engine', {
      stockScore: stockScore.toFixed(3),
      sceneScore: sceneScore.toFixed(3),
      thresholds: {
        stockPass: this.config.stockPassThreshold,
        wan: this.config.wanScoreThreshold,
        ltx: this.config.ltxScoreThreshold,
      },
    });

    // ✅ CASO 1: STOCK suficiente → usar directo (optimización de costos)
    if (stockScore > this.config.stockPassThreshold) {
      logger.info('[EngineSelector] STOCK quality sufficient → final', {
        stockScore: stockScore.toFixed(3),
      });
      return 'STOCK';
    }

    // 🚨 CASO 2: No hay APIs disponibles → STOCK fallback
    if (!this.config.ltxEnabled && !this.config.wanEnabled) {
      logger.info('[EngineSelector] No AI engines available → STOCK fallback');
      return 'STOCK';
    }

    // 🧠 CASO 3: Score alto + WAN disponible → WAN (Enhanced quality)
    if (sceneScore > this.config.wanScoreThreshold && this.config.wanEnabled) {
      logger.info('[EngineSelector] High score → WAN selected', {
        sceneScore: sceneScore.toFixed(3),
      });
      return 'WAN';
    }

    // 🧠 CASO 4: Score medio + LTX disponible → LTX (Draft quality)
    if (sceneScore > this.config.ltxScoreThreshold && this.config.ltxEnabled) {
      logger.info('[EngineSelector] Medium score → LTX selected', {
        sceneScore: sceneScore.toFixed(3),
      });
      return 'LTX';
    }

    // 🟢 CASO 5: Default → STOCK (score muy bajo, no vale la pena AI)
    logger.info('[EngineSelector] Low score → STOCK fallback', {
      sceneScore: sceneScore.toFixed(3),
    });
    return 'STOCK';
  }

  /**
   * Decide si debe intentar VEO async upgrade
   * VEO es el ÚNICO motor que puede hacer upgrade después
   *
   * Condiciones:
   * - VEO habilitado
   * - Score > 0.85 (threshold alto)
   * - Usuario engaged (leyendo narrativa > 5s)
   *
   * @param sceneScore - Score de la escena
   * @param userEngaged - Si usuario está engaged
   * @returns true si debe intentar VEO
   */
  shouldAttemptVeoUpgrade(sceneScore: number, userEngaged: boolean): boolean {
    if (!this.config.veoEnabled) {
      logger.debug('[EngineSelector] VEO disabled, no upgrade');
      return false;
    }

    if (sceneScore < this.config.veoUpgradeThreshold) {
      logger.debug('[EngineSelector] Score too low for VEO', {
        sceneScore: sceneScore.toFixed(3),
        threshold: this.config.veoUpgradeThreshold,
      });
      return false;
    }

    if (!userEngaged) {
      logger.debug('[EngineSelector] User not engaged, skipping VEO');
      return false;
    }

    logger.info('[EngineSelector] VEO upgrade approved', {
      sceneScore: sceneScore.toFixed(3),
      userEngaged,
    });

    return true;
  }

  /**
   * Get human-readable reason for engine selection (para debugging/logs)
   */
  getSelectionReason(engine: Engine, stockScore: number, sceneScore: number): string {
    switch (engine) {
      case 'STOCK':
        if (stockScore > this.config.stockPassThreshold) {
          return `Stock quality sufficient (${(stockScore * 100).toFixed(0)}%)`;
        }
        if (sceneScore < this.config.ltxScoreThreshold) {
          return `Scene score too low for AI (${(sceneScore * 100).toFixed(0)}%)`;
        }
        return 'No AI engines available';

      case 'LTX':
        return `Medium complexity scene (${(sceneScore * 100).toFixed(0)}%)`;

      case 'WAN':
        return `High complexity scene (${(sceneScore * 100).toFixed(0)}%)`;

      case 'VEO':
        return `Premium quality upgrade (${(sceneScore * 100).toFixed(0)}%)`;

      default:
        return 'Unknown';
    }
  }
}
