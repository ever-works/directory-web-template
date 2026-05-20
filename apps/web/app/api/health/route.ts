import { NextResponse } from 'next/server';

/**
 * GET /api/health — uptime probe.
 *
 * Returns 200 when the application has booted and is serving requests.
 * Does NOT consult the database — that lives under `/api/health/database`
 * so an uptime monitor can distinguish "process up" from "database OK".
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
	'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0'
} as const;

export async function GET() {
	return NextResponse.json(
		{
			status: 'ok',
			timestamp: new Date().toISOString(),
			uptime: process.uptime()
		},
		{ headers: NO_CACHE_HEADERS }
	);
}

export async function HEAD() {
	return new NextResponse(null, { status: 200, headers: NO_CACHE_HEADERS });
}
