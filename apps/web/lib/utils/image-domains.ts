/**
 * Dynamic image domain configuration
 * This utility helps manage external image domains dynamically
 */

export const COMMON_IMAGE_DOMAINS = [
	'lh3.googleusercontent.com',
	'avatars.githubusercontent.com',
	'platform-lookaside.fbsbx.com',
	'pbs.twimg.com',
	'images.unsplash.com'
];

export const ICON_DOMAINS = [
	'flaticon.com',
	'iconify.design',
	'icons8.com',
	'feathericons.com',
	'heroicons.com',
	'tabler-icons.io'
];

/**
 * Generate remote patterns for Next.js image configuration
 */
export function generateImageRemotePatterns() {
	const patterns = [
		{
			protocol: 'https' as const,
			hostname: 'lh3.googleusercontent.com',
			pathname: '/a/**'
		},
		{
			protocol: 'https' as const,
			hostname: 'avatars.githubusercontent.com',
			pathname: '/u/**'
		},
		{
			protocol: 'https' as const,
			hostname: 'platform-lookaside.fbsbx.com',
			pathname: '/platform/**'
		},
		{
			protocol: 'https' as const,
			hostname: 'pbs.twimg.com',
			pathname: '/**'
		},
		{
			protocol: 'https' as const,
			hostname: 'images.unsplash.com',
			pathname: '/**'
		}
	];

	// Add wildcard patterns for common domains
	[...COMMON_IMAGE_DOMAINS, ...ICON_DOMAINS].forEach((domain) => {
		patterns.push({
			protocol: 'https' as const,
			hostname: `*.${domain}`,
			pathname: '/**'
		});
	});

	return patterns;
}

/**
 * Check if a URL is from an allowed image domain
 */
export function isAllowedImageDomain(url: string): boolean {
	try {
		if (!/^https?:\/\//i.test(url)) return true;
		const urlObj = new URL(url);
		const hostname = urlObj.hostname.toLowerCase();

		if (COMMON_IMAGE_DOMAINS.map((d) => d.toLowerCase()).includes(hostname)) return true;
		if (ICON_DOMAINS.map((d) => d.toLowerCase()).includes(hostname)) return true;

		for (const domain of [...COMMON_IMAGE_DOMAINS, ...ICON_DOMAINS].map((d) => d.toLowerCase())) {
			if (hostname.endsWith(`.${domain}`)) return true;
		}

		return false;
	} catch {
		return false;
	}
}

/**
 * Add a new domain to the allowed list dynamically
 * This function can be used to add domains at runtime
 */
export function addImageDomain(domain: string, isIconDomain: boolean = false): void {
	if (isIconDomain) {
		if (!ICON_DOMAINS.includes(domain)) {
			ICON_DOMAINS.push(domain);
		}
	} else {
		if (!COMMON_IMAGE_DOMAINS.includes(domain)) {
			COMMON_IMAGE_DOMAINS.push(domain);
		}
	}
}

/**
 * Remove a domain from the allowed list
 */
export function removeImageDomain(domain: string): void {
	const iconIndex = ICON_DOMAINS.indexOf(domain);
	if (iconIndex > -1) {
		ICON_DOMAINS.splice(iconIndex, 1);
	}

	const commonIndex = COMMON_IMAGE_DOMAINS.indexOf(domain);
	if (commonIndex > -1) {
		COMMON_IMAGE_DOMAINS.splice(commonIndex, 1);
	}
}

/**
 * Get all currently allowed domains
 */
export function getAllowedDomains(): { common: string[]; icons: string[] } {
	return {
		common: [...COMMON_IMAGE_DOMAINS],
		icons: [...ICON_DOMAINS]
	};
}

export function isProblematicUrl(url: string) {
	try {
		const u = new URL(url);
		const host = u.hostname.toLowerCase();
		const path = u.pathname.toLowerCase();
		if ((host === 'flaticon.com' || host.endsWith('.flaticon.com')) && path.includes('/icone-gratuite/'))
			return true;
		if (u.search.includes('related_id=') || u.search.includes('origin=')) return true;
		const hasImageExt = /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(path);
		return !hasImageExt;
	} catch {
		return true;
	}
}

/**
 * Check if a string is a valid image URL format
 * Only validates URL structure, not if the image actually exists
 */
export function isValidImageUrl(url: string): boolean {
	if (!url) return false;

	// Allow relative URLs starting with /
	if (url.startsWith('/')) return true;

	// Check for valid absolute URL format
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch {
		return false;
	}
}

// If no URL, URL is problematic, or image failed to load, show default icon
export function shouldShowFallback(url: string) {
	const shouldShowFallback = !url || isProblematicUrl(url);
	return shouldShowFallback;
}
