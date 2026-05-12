/**
 * Fallback Chain
 * Implements cascading fallback: WAN → LTX → STOCK
 * Guarantees: Always returns a result (STOCK is guaranteed fallback)
 */

import { Engine } from '../config/CinematicConfig';
import { VideoGenerationRequest, VideoGenerationResult } from '../types';
import { safeGenerate } from './SafeGenerationWrapper';
import { logger } from '../../../utils/logger';

interface Providers {
  wan: any;
  ltx: any;
  stock: any;
}

export class FallbackChain {
  constructor(
    private providers: Providers,
    private config: { wanEnabled: boolean; ltxEnabled: boolean }
  ) {}

  /**
   * Genera con fallback en cascada: WAN → LTX → STOCK
   * VEO nunca es base engine (solo async upgrade)
   */
  async generateWithFallback(
    request: VideoGenerationRequest,
    baseEngine: Engine
  ): Promise<{ clip: VideoGenerationResult; engine: Engine }> {
    let engine = baseEngine;

    // 🔵 VEO nunca es base engine (redirigir a WAN)
    if (engine === 'VEO') {
      logger.info('[Fallback] VEO as base → downgrade to WAN');
      engine = 'WAN';
    }

    // 🟡 Intentar WAN
    if (engine === 'WAN') {
      const wan = await safeGenerate(
        'WAN',
        () => this.providers.wan.generate(request),
        this.config.wanEnabled
      );

      if (wan) {
        logger.info('[Fallback] WAN succeeded');
        return { clip: wan, engine: 'WAN' };
      }

      logger.warn('[Fallback] WAN failed → trying LTX');
      engine = 'LTX';
    }

    // 🟡 Intentar LTX
    if (engine === 'LTX') {
      const ltx = await safeGenerate(
        'LTX',
        () => this.providers.ltx.generate(request),
        this.config.ltxEnabled
      );

      if (ltx) {
        logger.info('[Fallback] LTX succeeded');
        return { clip: ltx, engine: 'LTX' };
      }

      logger.warn('[Fallback] LTX failed → using STOCK');
      engine = 'STOCK';
    }

    // 🟢 STOCK (guaranteed fallback)
    logger.info('[Fallback] Using STOCK (final fallback)');
    const stock = await this.providers.stock.generate(request);

    return { clip: stock, engine: 'STOCK' };
  }
}
