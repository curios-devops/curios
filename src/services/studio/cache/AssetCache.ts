/**
 * Asset Cache Manager
 * Cache para imágenes y videos para evitar re-descargas
 */

import { logger } from '../../../utils/logger';

interface CacheEntry {
  url: string;
  blob: Blob;
  timestamp: number;
  type: 'image' | 'video';
}

export class AssetCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number; // MB
  private currentSize: number; // bytes
  private maxAge: number; // milliseconds

  constructor(maxSizeMB: number = 100, maxAgeMinutes: number = 30) {
    this.cache = new Map();
    this.maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
    this.currentSize = 0;
    this.maxAge = maxAgeMinutes * 60 * 1000; // Convert to ms
  }

  /**
   * Get asset from cache or fetch and cache it
   */
  async get(url: string, type: 'image' | 'video'): Promise<Blob | null> {
    // Check if in cache and not expired
    const cached = this.cache.get(url);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      
      if (age < this.maxAge) {
        logger.debug('[AssetCache] Cache HIT', { url: url.substring(0, 50), age: Math.round(age / 1000) + 's' });
        return cached.blob;
      } else {
        // Expired, remove
        logger.debug('[AssetCache] Cache EXPIRED', { url: url.substring(0, 50) });
        this.remove(url);
      }
    }

    // Cache MISS - fetch and cache
    logger.debug('[AssetCache] Cache MISS, fetching...', { url: url.substring(0, 50) });
    
    try {
      const blob = await this.fetch(url);
      
      if (blob) {
        await this.set(url, blob, type);
      }
      
      return blob;
    } catch (error) {
      logger.error('[AssetCache] Fetch failed', { url: url.substring(0, 50), error });
      return null;
    }
  }

  /**
   * Fetch asset from URL
   */
  private async fetch(url: string): Promise<Blob | null> {
    try {
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      logger.error('[AssetCache] Fetch error', { url: url.substring(0, 50), error });
      return null;
    }
  }

  /**
   * Store asset in cache
   */
  private async set(url: string, blob: Blob, type: 'image' | 'video'): Promise<void> {
    const size = blob.size;

    // Check if we need to evict old entries
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictOldest();
    }

    // Still too big after eviction? Don't cache
    if (this.currentSize + size > this.maxSize) {
      logger.warn('[AssetCache] Asset too large to cache', { 
        url: url.substring(0, 50),
        size: Math.round(size / 1024) + 'KB',
        maxSize: Math.round(this.maxSize / 1024 / 1024) + 'MB'
      });
      return;
    }

    // Add to cache
    this.cache.set(url, {
      url,
      blob,
      timestamp: Date.now(),
      type
    });

    this.currentSize += size;

    logger.debug('[AssetCache] Asset cached', {
      url: url.substring(0, 50),
      size: Math.round(size / 1024) + 'KB',
      cacheSize: Math.round(this.currentSize / 1024 / 1024) + 'MB',
      entries: this.cache.size
    });
  }

  /**
   * Remove asset from cache
   */
  private remove(url: string): void {
    const entry = this.cache.get(url);
    
    if (entry) {
      this.cache.delete(url);
      this.currentSize -= entry.blob.size;
      
      logger.debug('[AssetCache] Asset removed', {
        url: url.substring(0, 50),
        cacheSize: Math.round(this.currentSize / 1024 / 1024) + 'MB'
      });
    }
  }

  /**
   * Evict oldest entry from cache (LRU)
   */
  private evictOldest(): void {
    let oldestUrl: string | null = null;
    let oldestTime = Date.now();

    for (const [url, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestUrl = url;
      }
    }

    if (oldestUrl) {
      logger.debug('[AssetCache] Evicting oldest entry', {
        url: oldestUrl.substring(0, 50),
        age: Math.round((Date.now() - oldestTime) / 1000) + 's'
      });
      this.remove(oldestUrl);
    }
  }

  /**
   * Preload assets for next chapter
   */
  async preload(urls: string[], type: 'image' | 'video'): Promise<void> {
    logger.info('[AssetCache] Preloading assets', { count: urls.length, type });

    const promises = urls.map(url => this.get(url, type));
    await Promise.allSettled(promises);

    logger.info('[AssetCache] Preload complete', { count: urls.length });
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    logger.info('[AssetCache] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      entries: this.cache.size,
      size: this.currentSize,
      sizeMB: Math.round(this.currentSize / 1024 / 1024 * 100) / 100,
      maxSizeMB: Math.round(this.maxSize / 1024 / 1024),
      utilization: Math.round((this.currentSize / this.maxSize) * 100)
    };
  }
}

// Singleton instance
export const assetCache = new AssetCache(100, 30); // 100MB, 30 minutes
