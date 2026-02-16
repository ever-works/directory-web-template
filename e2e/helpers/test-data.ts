function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}. Set it in .env.local`);
	}
	return value;
}

export const TEST_DATA = {
	ADMIN_EMAIL: requireEnv('SEED_ADMIN_EMAIL'),
	ADMIN_PASSWORD: requireEnv('SEED_ADMIN_PASSWORD'),
	CLIENT_PASSWORD: 'TestClient123!',
	generateClientEmail: () => `e2e-client-${Date.now()}@test.local`,
} as const;

export const PUBLIC_ROUTES = [
	{ path: '/', name: 'Home' },
	{ path: '/discover/1', name: 'Discover Page 1' },
	{ path: '/categories', name: 'Categories' },
	{ path: '/tags', name: 'Tags' },
	{ path: '/collections', name: 'Collections' },
	{ path: '/pricing', name: 'Pricing' },
	{ path: '/about', name: 'About' },
	{ path: '/help', name: 'Help' },
	{ path: '/privacy-policy', name: 'Privacy Policy' },
	{ path: '/terms-of-service', name: 'Terms of Service' },
	{ path: '/cookies', name: 'Cookies' },
	{ path: '/auth/signin', name: 'Sign In' },
	{ path: '/auth/register', name: 'Register' },
] as const;

export const AUTH_STATE_DIR = 'auth-states';
export const ADMIN_STATE_FILE = `${AUTH_STATE_DIR}/admin.json`;
export const CLIENT_STATE_FILE = `${AUTH_STATE_DIR}/client.json`;
