import 'server-only';
import crypto from 'node:crypto';

export function createDevelopmentAuthSecret(): string {
	const fallbackSeed = [
		process.env.VERCEL_PROJECT_PRODUCTION_URL,
		process.env.VERCEL_URL,
		process.env.NEXT_PUBLIC_APP_URL,
		process.env.VERCEL_PROJECT_ID,
		process.env.NEXT_PUBLIC_SITE_URL
	]
		.filter(Boolean)
		.join('|');

	if (fallbackSeed) {
		return crypto.createHash('sha256').update(fallbackSeed).digest('hex');
	}

	return crypto.randomBytes(32).toString('hex');
}
