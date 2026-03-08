/**
 * Cache-aware session retrieval functions
 * Reduces 20x authentication overhead by caching decoded sessions
 */

import { NextRequest } from 'next/server';
import { Session } from 'next-auth';
import { sessionCache, createSessionIdentifier, logCacheStats } from './session-cache';
import { coreConfig } from '@/lib/config/config-service';

// Dynamic import to avoid bundling database driver in Edge Runtime
async function getAuth() {
  const { auth } = await import('./index');
  return auth;
}

/**
 * Get session with caching for server components and API routes
 * Replaces direct NextAuth auth() calls with cached version
 */
export async function getCachedSession(request?: Request): Promise<Session | null> {
  try {
    // Extract session token from request if available
    const sessionToken = extractSessionToken(request);

    // Try cache first if we have an identifier
    if (sessionToken) {
      const identifier = createSessionIdentifier(sessionToken);
      const cachedSession = await sessionCache.get(identifier);

      if (cachedSession) {
        if (coreConfig.NODE_ENV === 'development') {
          console.log('[SessionCache] Cache HIT for token:', sessionToken.substring(0, 8) + '...');
        }
        return cachedSession;
      }
    }

    // Cache miss - fetch from NextAuth
    if (coreConfig.NODE_ENV === 'development') {
      console.log('[SessionCache] Cache MISS - fetching from NextAuth');
    }

    const auth = await getAuth();
    const session = await auth();

    // Cache the session if we have it and an identifier
    if (session && sessionToken) {
      const identifier = createSessionIdentifier(sessionToken);
      await sessionCache.set(identifier, session);

      if (coreConfig.NODE_ENV === 'development') {
        console.log('[SessionCache] Cached new session for token:', sessionToken.substring(0, 8) + '...');
      }
    }

    // Log stats periodically in development
    if (coreConfig.NODE_ENV === 'development' && Math.random() < 0.1) {
      logCacheStats();
    }

    return session;
  } catch (error) {
    console.error('[SessionCache] Error retrieving session:', error);
    // Fallback to direct NextAuth call
    const auth = await getAuth();
    return await auth();
  }
}

/**
 * Get session for API routes with request context
 */
export async function getCachedApiSession(request: NextRequest): Promise<Session | null> {
  return getCachedSession(request);
}

/**
 * Invalidate cached session (for logout, profile updates, etc.)
 */
export async function invalidateSessionCache(sessionToken?: string, userId?: string): Promise<void> {
  try {
    if (sessionToken) {
      const identifier = createSessionIdentifier(sessionToken);
      await sessionCache.delete(identifier);

      if (coreConfig.NODE_ENV === 'development') {
        console.log('[SessionCache] Invalidated session cache for token:', sessionToken.substring(0, 8) + '...');
      }
    }

    if (userId) {
      const identifier = createSessionIdentifier(undefined, userId);
      await sessionCache.delete(identifier);

      if (coreConfig.NODE_ENV === 'development') {
        console.log('[SessionCache] Invalidated session cache for user:', userId);
      }
    }
  } catch (error) {
    console.error('[SessionCache] Error invalidating cache:', error);
  }
}

/**
 * Clear all cached sessions (for deployment, critical updates)
 */
export function clearSessionCache(): void {
  sessionCache.clear();

  if (coreConfig.NODE_ENV === 'development') {
    console.log('[SessionCache] Cleared all cached sessions');
  }
}

/**
 * Extract session token from various request sources
 */
function extractSessionToken(request?: Request): string | null {
  if (!request) return null;

  try {
    // Method 1: Check cookies for NextAuth session token
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const cookies = parseCookies(cookieHeader);

      // NextAuth.js default session token cookie names
      const sessionToken = cookies['next-auth.session-token'] ||
                          cookies['__Secure-next-auth.session-token'] ||
                          cookies['next-auth.csrf-token'];

      if (sessionToken) {
        return sessionToken;
      }
    }

    // Method 2: Check Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Method 3: Check for custom session header
    const sessionHeader = request.headers.get('x-session-token');
    if (sessionHeader) {
      return sessionHeader;
    }

    return null;
  } catch (error) {
    console.error('[SessionCache] Error extracting session token:', error);
    return null;
  }
}

/**
 * Simple cookie parser
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  cookieHeader.split(';').forEach(cookie => {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name && valueParts.length > 0) {
      cookies[name] = decodeURIComponent(valueParts.join('='));
    }
  });

  return cookies;
}

/**
 * Get cache statistics for monitoring
 */
export function getSessionCacheStats() {
  return sessionCache.getStats();
}

/**
 * Hook for React components to use cached sessions
 * Note: This is for server-side usage. Client-side should still use useSession from next-auth/react
 */
export async function useServerSession(): Promise<Session | null> {
  return getCachedSession();
}