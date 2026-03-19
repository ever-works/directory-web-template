/**
 * In-memory session cache for eliminating 20x authentication overhead
 * MVP implementation with memory storage and fixed TTL
 */

import { Session } from 'next-auth';
import { coreConfig } from '@/lib/config/config-service';

interface CachedSession {
  session: Session;
  expiresAt: number;
  createdAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

class SessionCache {
  private cache = new Map<string, CachedSession>();
  private readonly TTL_MS = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_SIZE = 1000; // Prevent memory leaks
  private stats = { hits: 0, misses: 0 };

  /**
   * Generate cache key from session token or user ID
   */
  private async generateKey(identifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(identifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 32);
  }

  /**
   * Check if cached entry is expired
   */
  private isExpired(cached: CachedSession): boolean {
    return Date.now() > cached.expiresAt;
  }

  /**
   * Clean up expired entries and enforce size limit
   */
  private cleanup(): void {
    const now = Date.now();

    // Remove expired entries
    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(key);
      }
    }

    // Enforce size limit with LRU eviction
    if (this.cache.size > this.MAX_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].createdAt - b[1].createdAt);

      const toDelete = entries.slice(0, this.cache.size - this.MAX_SIZE);
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Get session from cache
   */
  async get(identifier: string): Promise<Session | null> {
    const key = await this.generateKey(identifier);
    const cached = this.cache.get(key);

    if (!cached) {
      this.stats.misses++;
      return null;
    }

    if (this.isExpired(cached)) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return cached.session;
  }

  /**
   * Store session in cache
   */
  async set(identifier: string, session: Session): Promise<void> {
    const key = await this.generateKey(identifier);
    const now = Date.now();

    this.cache.set(key, {
      session,
      expiresAt: now + this.TTL_MS,
      createdAt: now,
    });

    // Periodic cleanup to prevent memory leaks
    if (Math.random() < 0.1) { // 10% chance
      this.cleanup();
    }
  }

  /**
   * Remove session from cache
   */
  async delete(identifier: string): Promise<void> {
    const key = await this.generateKey(identifier);
    this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const size = this.cache.size;
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size,
      hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Get cache key for external use (debugging)
   */
  async getCacheKey(identifier: string): Promise<string> {
    return this.generateKey(identifier);
  }
}

// Singleton instance for application-wide use
export const sessionCache = new SessionCache();

// Helper function to create cache identifier from request
export function createSessionIdentifier(sessionToken?: string, userId?: string): string {
  if (sessionToken) {
    return `token:${sessionToken}`;
  }
  if (userId) {
    return `user:${userId}`;
  }
  throw new Error('Either sessionToken or userId must be provided for cache identifier');
}

// Development helper for monitoring cache performance
export function logCacheStats(): void {
  if (coreConfig.NODE_ENV === 'development') {
    const stats = sessionCache.getStats();
    console.log(`[SessionCache] Stats:`, {
      hits: stats.hits,
      misses: stats.misses,
      hitRate: `${stats.hitRate}%`,
      size: stats.size,
    });
  }
}