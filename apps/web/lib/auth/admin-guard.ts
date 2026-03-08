import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/db/roles';

/**
 * Middleware function to check if the current user is an admin
 * Returns a NextResponse with error if not authorized, or null if authorized
 */
export async function checkAdminAuth(): Promise<NextResponse | null> {
  try {
    // Check authentication
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user ID exists
    if (!session.user.id) {
      return NextResponse.json(
        { success: false, error: 'User ID not found' },
        { status: 401 }
      );
    }
    
    // Check if user has admin role by querying the database
    const userIsAdmin = await isAdmin(session.user.id);
    if (!userIsAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // User is authorized
    return null;
  } catch (error) {
    console.error('Error checking admin auth:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
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
