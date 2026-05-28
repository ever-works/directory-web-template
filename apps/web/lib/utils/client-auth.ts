import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { Session } from 'next-auth';

/**
 * Response type for client authentication check
 */
export interface ClientAuthResult {
  success: true;
  session: Session;
  userId: string;
}

export interface ClientAuthError {
  success: false;
  response: NextResponse;
}

/**
 * Validate that the request comes from an authenticated user.
 *
 * **The name suggests "non-admin only" but the implementation
 * intentionally allows admins through** — see the commented-out
 * `session.user.isAdmin` block below. The historical reason in that
 * inline comment is "We allow admins to use client endpoints for
 * testing purposes". If your endpoint should be strictly client-side
 * (i.e. admins must go through the admin API instead), don't rely
 * on this helper to enforce it — add an explicit `isAdmin` check at
 * the route handler.
 *
 * Audit note: the dormant restriction block has been in place since
 * March 2026 (file's initial commit) — if your security model evolved
 * to actually exclude admins, uncomment it AND rename the function
 * (e.g. `requireAuth`) so callers stop assuming client-only scope.
 *
 * @returns `{ success: true, session, userId }` if authenticated, or
 *   `{ success: false, response }` with a 401 NextResponse otherwise.
 */
export async function requireClientAuth(): Promise<ClientAuthResult | ClientAuthError> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in to continue.' },
        { status: 401 }
      ),
    };
  }

  // Note: We allow admins to use client endpoints for testing purposes
  // If you want to restrict admins, uncomment the following:
  // if (session.user.isAdmin) {
  //   return {
  //     success: false,
  //     response: NextResponse.json(
  //       { success: false, error: 'Admin users should use admin endpoints.' },
  //       { status: 403 }
  //     ),
  //   };
  // }

  return {
    success: true,
    session,
    userId: session.user.id,
  };
}

/**
 * Creates an unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  );
}

/**
 * Creates a forbidden response (authenticated but not authorized)
 */
export function forbiddenResponse(message: string = 'You do not have permission to perform this action'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  );
}

/**
 * Creates a not found response
 */
export function notFoundResponse(message: string = 'Resource not found'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 404 }
  );
}

/**
 * Creates a bad request response
 */
export function badRequestResponse(message: string = 'Bad request'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 400 }
  );
}

/**
 * Creates a conflict response (e.g., duplicate resource)
 */
export function conflictResponse(message: string = 'Resource already exists'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 409 }
  );
}

/**
 * Creates an internal server error response
 */
export function serverErrorResponse(error: unknown, defaultMessage: string = 'Internal server error'): NextResponse {
  // Log full error details server-side for debugging
  console.error('Server error:', error);
  // Always return generic message to clients to prevent information leakage
  return NextResponse.json(
    { success: false, error: defaultMessage },
    { status: 500 }
  );
}
