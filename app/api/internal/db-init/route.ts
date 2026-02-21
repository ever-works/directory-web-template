/**
 * Internal API route for database initialization
 * Triggers auto-migration and seeding if database is not yet initialized
 *
 * Security: Only accessible in development mode
 */
import { NextRequest, NextResponse } from 'next/server';
import { safeErrorResponse } from '@/lib/utils/api-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
	// Security: Only allow in development mode
	if (process.env.NODE_ENV !== 'development') {
		return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
	}

	try {
		const { initializeDatabase } = await import('@/lib/db/initialize');
		await initializeDatabase();
		
		return NextResponse.json({ 
			success: true, 
			message: 'Database initialization completed' 
		});
	} catch (error) {
		return safeErrorResponse(error, 'Database initialization failed');
	}
}
