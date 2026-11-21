/**
 * Breadcrumb trail for the `BreadcrumbList` JSON-LD (components/seo/breadcrumb-json-ld.tsx).
 * Pure, so the unit tests load it directly.
 */

export interface TrailInput {
	name: string;
	url?: string;
}

export interface TrailCrumb {
	name: string;
	/** Absolute URL; absent only on the last crumb (the current page). */
	url?: string;
}

function toAbsoluteUrl(url: string, baseUrl: string): string {
	if (/^https?:\/\//i.test(url)) return url;
	const cleanBase = baseUrl.replace(/\/$/, '');
	const cleanPath = url.startsWith('/') ? url : `/${url}`;
	return `${cleanBase}${cleanPath}`;
}

/**
 * Absolute crumbs, root first. The last crumb may have no URL (the page
 * itself, which Google allows); a crumb without a URL anywhere else is
 * dropped. Null when fewer than two crumbs remain: a one-entry trail says
 * nothing and Google ignores it.
 */
export function breadcrumbTrail(items: ReadonlyArray<TrailInput>, baseUrl: string): TrailCrumb[] | null {
	const crumbs: TrailCrumb[] = [];
	items.forEach((item, index) => {
		const name = typeof item.name === 'string' ? item.name.trim() : '';
		if (!name) return;
		if (item.url) {
			crumbs.push({ name, url: toAbsoluteUrl(item.url, baseUrl) });
		} else if (index === items.length - 1) {
			crumbs.push({ name });
		}
	});
	return crumbs.length >= 2 ? crumbs : null;
}
