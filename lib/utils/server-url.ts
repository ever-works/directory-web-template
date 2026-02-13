import { siteConfig } from '../config';

const WEB_URL = siteConfig.url;

export async function getFrontendUrl(): Promise<string> {
	if (typeof window !== 'undefined') {
		return window.location.origin;
	}

	try {
		const { headers } = await import('next/headers');
		const headersList = await headers();
		const host = headersList.get('x-forwarded-host') || headersList.get('host');
		const protocol = headersList.get('x-forwarded-proto') || 'https';

		if (host) {
			// Extract expected hostname from WEB_URL
			let expectedHost = '';
			try {
				expectedHost = new URL(WEB_URL).host;
			} catch (_e) {
				expectedHost = WEB_URL.replace(/https?:\/\//, '').split('/')[0];
			}

			// Simple validation: only trust headers if they match our config or if in development
			const isDev = process.env.NODE_ENV === 'development';
			const isTrusted = host === expectedHost || (isDev && host.includes('localhost'));

			if (isTrusted) {
				return `${protocol}://${host}`;
			}
		}
	} catch (e) {
		// This can happen in some edge cases during build/prerender
		console.warn('Failed to get headers in getFrontendUrl:', e);
	}

	return WEB_URL;
}
