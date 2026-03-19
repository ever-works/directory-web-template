import { NextResponse } from 'next/server';

/**
 * Checks if database is available and returns appropriate response if not
 * @returns null if database is available, NextResponse if not available
 */
export function checkDatabaseAvailability(): NextResponse | null {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        error: "Database not configured",
        code: "DATABASE_UNAVAILABLE",
        message: "This feature requires database configuration"
      },
      { status: 503 }
    );
  }
  return null;
}