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
 * Validates that the request is from an authenticated client user (non-admin).
 * Returns the session and user ID if authenticated, or an error response.
 *
 * @returns ClientAuthResult if authenticated, ClientAuthError if not
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
