import { configManager } from '@/lib/config-manager';
import { siteConfig } from '@/lib/config';

/**
 * Site identity (name / tagline / description) for SEO metadata.
 *
 * `siteConfig` (lib/config.ts) is a client-safe constant: it only knows the
 * `NEXT_PUBLIC_SITE_*` build-time env vars and otherwise falls back to the
 * generic "Ever Works" template defaults. Deployed Works rarely set those env
 * vars, so every directory used to ship `<title>Discover | Ever Works</title>`
 * and the template's demo meta description — regardless of what the directory
 * is actually about.
 *
 * These helpers resolve the identity SERVER-SIDE with a sensible fallback chain:
 *
 *   1. explicit `NEXT_PUBLIC_SITE_*` env var (template users who customised it win)
 *   2. the Work's own `.works/works.yml` (the data repository the site renders)
 *   3. the `siteConfig` template default
 *
 * Only import this module from server code (route handlers, `generateMetadata`,
 * server components): `configManager` reads `.works/works.yml` from disk.
 */

function envOverride(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function configString(keyPath: string): string | undefined {
	try {
		const value = configManager.getNestedValue(keyPath);
		if (typeof value !== 'string') return undefined;
		const trimmed = value.trim();
		return trimmed ? trimmed : undefined;
	} catch {
		// Config file missing / unreadable (fresh clone, CI without DATA_REPOSITORY, …):
		// fall through to the template default instead of failing metadata generation.
		return undefined;
	}
}

/**
 * Site name used in `<title>`, `og:site_name`, WebSite JSON-LD, etc.
 * Falls back to the Work's `company_name`, then its `name`, then the template default.
 */
export function getSiteName(): string {
	return (
		envOverride(process.env.NEXT_PUBLIC_SITE_NAME) ??
		configString('company_name') ??
		configString('name') ??
		siteConfig.name
	);
}

/**
 * Short tagline used next to the site name (homepage `<title>`, OG image).
 * Falls back to the Work's hero title ("hero_title hero_title_gradient"),
 * then the hero badge text, then the template default.
 */
export function getSiteTagline(): string {
	const fromEnv = envOverride(process.env.NEXT_PUBLIC_SITE_TAGLINE);
	if (fromEnv) return fromEnv;

	const heroTitle = [
		configString('settings.homepage.hero_title'),
		configString('settings.homepage.hero_title_gradient')
	]
		.filter(Boolean)
		.join(' ');
	return heroTitle || configString('settings.homepage.hero_badge_text') || siteConfig.tagline;
}

/**
 * Site description used for `<meta name="description">` / OG description fallbacks.
 * Falls back to the Work's hero description, then the template default.
 */
export function getSiteDescription(): string {
	return (
		envOverride(process.env.NEXT_PUBLIC_SITE_DESCRIPTION) ??
		configString('settings.homepage.hero_description') ??
		siteConfig.description
	);
}
