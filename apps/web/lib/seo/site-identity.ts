import { configManager } from '@/lib/config-manager';
import { siteConfig } from '@/lib/config';
import { ensureContentAvailable } from '@/lib/lib';

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
 * They are async because metadata generation can run on a cold container before
 * the content repository has been hydrated (Vercel `/tmp/.content`, a freshly
 * started k8s pod): each helper awaits `ensureContentAvailable()` first so the
 * very first response does not fall back to the template identity. Once the
 * content is initialised that await is a cheap existence check.
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

// One hydration attempt shared by every helper call in the process. A layout render
// calls these helpers several times; without this each call would re-enter
// `ensureContentAvailable()` and, when the clone fails (DATA_REPOSITORY set but the
// remote is unreachable), re-attempt it — blocking a single response for several
// clone timeouts. After a failure we back off for RETRY_AFTER_MS before trying again.
let contentReadyPromise: Promise<void> | null = null;
let lastContentFailureAt = 0;
const RETRY_AFTER_MS = 60_000;

function contentReady(): Promise<void> {
	if (contentReadyPromise) return contentReadyPromise;
	if (Date.now() - lastContentFailureAt < RETRY_AFTER_MS) return Promise.resolve();
	contentReadyPromise = ensureContentAvailable()
		.then(() => undefined)
		.catch(() => {
			// No DATA_REPOSITORY / clone failed (build without content, CI): the helpers
			// below degrade to the template defaults, exactly like before this module existed.
			lastContentFailureAt = Date.now();
			contentReadyPromise = null;
		});
	return contentReadyPromise;
}

/**
 * Site name used in `<title>`, `og:site_name`, WebSite JSON-LD, etc.
 * Falls back to the Work's `company_name`, then its `name`, then the template default.
 */
export async function getSiteName(): Promise<string> {
	const fromEnv = envOverride(process.env.NEXT_PUBLIC_SITE_NAME);
	if (fromEnv) return fromEnv;
	await contentReady();
	return configString('company_name') ?? configString('name') ?? siteConfig.name;
}

/**
 * Short tagline used next to the site name (homepage `<title>`, OG image).
 * Falls back to the Work's hero title ("hero_title hero_title_gradient"),
 * then the hero badge text, then the template default.
 */
export async function getSiteTagline(): Promise<string> {
	const fromEnv = envOverride(process.env.NEXT_PUBLIC_SITE_TAGLINE);
	if (fromEnv) return fromEnv;
	await contentReady();
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
export async function getSiteDescription(): Promise<string> {
	const fromEnv = envOverride(process.env.NEXT_PUBLIC_SITE_DESCRIPTION);
	if (fromEnv) return fromEnv;
	await contentReady();
	return configString('settings.homepage.hero_description') ?? siteConfig.description;
}
