/**
 * The query string (without `?`) of a page's `searchParams`, for links that must keep a
 * listing's filters. Repeated parameters (`?tags=a&tags=b`) stay repeated; empty values drop.
 */
export function toSearchString(searchParams: Record<string, string | string[] | undefined>): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(searchParams)) {
		for (const v of Array.isArray(value) ? value : [value]) {
			if (v) params.append(key, v);
		}
	}
	return params.toString();
}
