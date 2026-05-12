import { cache } from 'react';
import { NextRequest, NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/db/roles';

/**
 * Request-scoped memo of `isAdmin(userId)`. Multiple guard calls within a
 * single request (e.g. a route that calls `checkAdminAuth()` and then a
 * helper that also probes admin state) share one DB round-trip.
 *
 * `react.cache` is request-scoped in the App Router server runtime — it does
 * not leak across requests.
 */
const isAdminCached = cache((userId: string) => isAdmin(userId));

/**
 * Session shape returned by {@link requireAdminSession} after admin verification.
 * `user.id` is guaranteed to be a non-empty string and the caller is verified
 * as an admin against the database.
 */
export type AdminSession = Session & {
  user: NonNullable<Session['user']> & { id: string };
};

/**
 * Resolve the current session and verify admin status against the database.
 *
 * The DB lookup is intentional: `session.user.isAdmin` is a JWT claim set at
 * sign-in and is sticky for the JWT's 30-day lifetime. Authorization decisions
 * for admin endpoints must reflect the live role state, not a stale claim.
 *
 * Returns either:
 *   - { session } when the caller is an authenticated admin, or
 *   - a NextResponse error (401 unauthenticated, 403 forbidden, 500 on guard failure).
 */
export async function requireAdminSession(): Promise<{ session: AdminSession } | NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userIsAdmin = await isAdminCached(session.user.id);
    if (!userIsAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    return { session: session as AdminSession };
  } catch (error) {
    console.error('Error checking admin auth:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Lightweight admin guard for handlers that don't need the session object.
 * Returns a NextResponse with error if not authorized, or null if authorized.
 */
export async function checkAdminAuth(): Promise<NextResponse | null> {
  const result = await requireAdminSession();
  return result instanceof NextResponse ? result : null;
}

/**
 * Higher-order function that wraps API route handlers with admin authentication
 * Usage: export const GET = withAdminAuth(async (request) => { ... })
 */
export function withAdminAuth<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authError = await checkAdminAuth();
    if (authError) {
      return authError;
    }

    return handler(request, ...args);
  };
}
