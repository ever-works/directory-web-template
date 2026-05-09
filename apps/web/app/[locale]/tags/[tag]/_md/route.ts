/**
 * Internal handler for the `/tags/<tag>.md` Markdown mirror.
 * Public URL: `/<locale>/tags/<tag>.md`.
 */

import { getCachedItems } from '@/lib/content';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { renderTagMarkdown, MARKDOWN_RESPONSE_HEADERS } from '@/lib/seo/markdown-mirror';

export const revalidate = 600;

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ tag: string; locale: string }> }
): Promise<Response> {
	const { tag, locale } = await params;
	const decoded = decodeURIComponent(tag);
	const { items, tags } = await getCachedItems({ lang: locale });

	const matchedTag = tags.find(
		(t) => t.id === decoded || t.name.toLowerCase() === decoded.toLowerCase()
	);

	const matchingItems = items.filter((item) =>
		item.tags?.some((t: string | { id: string }) => {
			const value = typeof t === 'string' ? t : t?.id;
			return value?.toLowerCase() === decoded.toLowerCase();
		})
	);

	const md = renderTagMarkdown(matchedTag, matchingItems, {
		baseUrl: getBaseUrl(),
		locale,
		tagRef: tag
	});

	return new Response(md, { status: 200, headers: { ...MARKDOWN_RESPONSE_HEADERS } });
}
