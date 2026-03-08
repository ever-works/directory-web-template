/**
 * Script-safe database configuration.
 * Does NOT use 'server-only' so it can be imported by migration/seed scripts.
 * For full application config, use @/lib/config instead.
 */

export function getDatabaseUrl(): string | undefined {
	return process.env.DATABASE_URL;
}

export function getNodeEnv(): 'development' | 'production' | 'test' {
	const env = process.env.NODE_ENV;
	if (env === 'production' || env === 'test') return env;
	return 'development';
}

export function isProduction(): boolean {
	return getNodeEnv() === 'production';
}
