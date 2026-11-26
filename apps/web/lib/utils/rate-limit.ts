/**
 * Simple in-memory rate limiting utility
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitState {
  store: Map<string, RateLimitEntry>;
  cleanupStarted: boolean;
}

/**
 * The in-memory store lives on `globalThis`, so every copy of this module in the process reads and
 * writes one map. The bundler loads this file once per layer: the sign-in server action
 * (`app/[locale]/auth/actions.ts`) and the NextAuth route handler that runs `authorize`
 * (`lib/auth/credentials.ts`) each get their own copy. With a map per copy, each counted the
 * per-email sign-in password budget on its own, so five wrong passwords through the form left the
 * callback a fresh budget of five more (T-2844).
 */
const RATE_LIMIT_STATE_KEY = Symbol.for('ever-works.rate-limit-state.v1');

function rateLimitState(): RateLimitState {
  const holder = globalThis as typeof globalThis & { [RATE_LIMIT_STATE_KEY]?: RateLimitState };
  let state = holder[RATE_LIMIT_STATE_KEY];
  if (!state) {
    state = { store: new Map(), cleanupStarted: false };
    holder[RATE_LIMIT_STATE_KEY] = state;
  }
  return state;
}

const sharedState = rateLimitState();

// In-memory store for rate limiting, shared by every copy of this module
const rateLimitStore = sharedState.store;

// Cleanup old entries every 5 minutes. One interval per process, not one per module copy.
if (!sharedState.cleanupStarted) {
  sharedState.cleanupStarted = true;
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  // Unref'd: a server still runs it, and a script or `tsx --test` spec that loads this module
  // (directly or through lib/auth) can exit when its work is done (T-2854).
  cleanup.unref?.();
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Rate limiting function
 * @param key - Unique identifier for the rate limit (e.g., IP address, user ID)
 * @param limit - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns RateLimitResult
 */
export async function ratelimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetTime = now + windowMs;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // First request or window has expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime,
    });
    
    return {
      success: true,
      remaining: limit - 1,
      resetTime,
    };
  }
  
  if (entry.count >= limit) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000), // seconds
    };
  }
  
  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    success: true,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Reset rate limit for a specific key
 * @param key - The key to reset
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Give back ONE consumed slot for a key, without touching its window.
 *
 * The counterpart to a `ratelimit()` call used as an atomic *reservation*:
 * reserve first (so concurrent callers cannot all pass a check-then-act
 * gap), then refund when the attempt turns out not to have been the kind
 * the budget is meant to count. Unlike {@link resetRateLimit} this does not
 * clear the whole bucket, so one caller's refund cannot wipe out another's
 * recorded attempts.
 *
 * `reservedResetTime` is the `resetTime` the reserving `ratelimit()` call
 * returned. If that window ran out while the attempt was in flight and a
 * later call opened a new one, the refund is dropped: taking it off the new
 * window would erase an attempt that window counted.
 *
 * No-op when the key has no live entry, or its entry is a later window.
 */
export function refundRateLimit(key: string, reservedResetTime: number): void {
  const entry = rateLimitStore.get(key);
  if (!entry) return;

  // The reservation's window was replaced by a later one: nothing to give back.
  if (entry.resetTime !== reservedResetTime) return;

  if (Date.now() > entry.resetTime) {
    rateLimitStore.delete(key);
    return;
  }

  entry.count = Math.max(0, entry.count - 1);
  rateLimitStore.set(key, entry);
}

/**
 * Get current rate limit status without incrementing
 * @param key - The key to check
 * @param limit - Maximum number of requests allowed
 * @returns Current status
 */
export function getRateLimitStatus(key: string, limit: number): {
  remaining: number;
  resetTime: number | null;
} {
  const entry = rateLimitStore.get(key);
  const now = Date.now();
  
  if (!entry || now > entry.resetTime) {
    return {
      remaining: limit,
      resetTime: null,
    };
  }
  
  return {
    remaining: Math.max(0, limit - entry.count),
    resetTime: entry.resetTime,
  };
}
