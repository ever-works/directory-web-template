import { notFound } from 'next/navigation';
import { resolveTagsPage } from './resolve-tags-page';

/**
 * Real 404s for this route. Its loading.tsx wraps page.tsx in a Suspense
 * boundary, so a notFound() thrown in the page (or its metadata) came after the
 * 200 status line had been streamed: /tags/paging/abc, /02 or a page past the
 * last one answered 200 with a `noindex` not-found page (a soft 404). A layout
 * renders OUTSIDE its own segment's loading boundary, so the same check here
 * fails before any byte of the response is sent.
 */
export default async function TagsPagingLayout({
	children,
	params
}: {
	children: React.ReactNode;
	params: Promise<{ page: string; locale: string }>;
}) {
	const { page, locale } = await params;
	if (!(await resolveTagsPage(page, locale))) {
		notFound();
	}
	return children;
}
