/**
 * Request cache utility for API responses
 * Implements LRU (Least Recently Used) cache with TTL support
 */

import { CacheConfig, CacheStats, CacheEntry } from '../types/index.js';

/**
 * RequestCache class
 * Caches API responses with automatic expiration and LRU eviction
 */
export class RequestCache<T = any> {
  private readonly maxSize: number;
  private readonly ttl: number;
  private cache: Map<string, CacheEntry<T>>;
  private hits: number = 0;
  private misses: number = 0;

  constructor(config: CacheConfig = {}) {
    this.maxSize = config.maxSize || 100;
    this.ttl = config.ttl || 300000; // 5 minutes default
    this.cache = new Map();
  }

  /**
   * Generate cache key from URL and options
   */
  private generateKey(url: string, options: any = {}): string {
    const params = new URLSearchParams(options.params || {}).toString();
    return `${url}${params ? '?' + params : ''}`;
  }

  /**
   * Get cached value by key
   */
  get(url: string, options: any = {}): T | null {
    const key = this.generateKey(url, options);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to end (most recently used) by deleting and re-adding
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;

    return entry.data;
  }

  /**
   * Set cached value
   */
  set(url: string, data: T, options: any = {}): void {
    const key = this.generateKey(url, options);

    // Implement LRU eviction if at max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Delete the first (least recently used) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    // Add new entry
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if key exists in cache
   */
  has(url: string, options: any = {}): boolean {
    const key = this.generateKey(url, options);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete cache entry
   */
  delete(url: string, options: any = {}): boolean {
    const key = this.generateKey(url, options);
    return this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    // Clean expired entries before calculating stats
    this.cleanExpired();

    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
    };
  }

  /**
   * Remove expired entries
   */
  private cleanExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size;
  }
}

export default RequestCache;
