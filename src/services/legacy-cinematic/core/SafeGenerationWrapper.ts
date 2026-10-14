/**
 * Safe Generation Wrapper
 * Wraps video generation calls with automatic fallback on failure
 */

import { logger } from '../../../utils/logger';

export type Engine = 'STOCK' | 'LTX' | 'WAN' | 'VEO';

/**
 * Safely executes a generator function with automatic error handling
 * Returns null on failure instead of throwing (enables fallback chain)
 *
 * @param engine - Engine name for logging
 * @param generator - Async function that generates the video
 * @param enabled - Whether this engine is enabled in config
 * @returns Result or null on failure
 */
export async function safeGenerate<T>(
  engine: Engine,
  generator: () => Promise<T>,
  enabled: boolean
): Promise<T | null> {
  if (!enabled) {
    logger.info(`[SafeGen] ${engine} disabled, skipping`);
    return null;
  }

  try {
    const result = await generator();
    logger.info(`[SafeGen] ${engine} succeeded`);
    return result;
  } catch (error) {
    logger.warn(`[SafeGen] ${engine} failed → fallback`, {
      error: error instanceof Error ? error.message : String(error),
      engine,
    });
    return null;
  }
}
