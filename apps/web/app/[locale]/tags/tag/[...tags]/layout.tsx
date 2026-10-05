import { notFound } from 'next/navigation';
import { resolveTagAlias } from './resolve-tag-alias';

/**
 * Real 404s for this route. Its loading.tsx wraps page.tsx in a Suspense
 * boundary, so a notFound() thrown in the page (or its metadata) came after the
 * 200 status line had been streamed: an unknown tag, or a URL that is not one
 * of the tag's pages, answered 200 with a `noindex` not-found page (a soft
 * 404). A layout renders OUTSIDE its own segment's loading boundary, so the
 * same lookup here fails before any byte of the response is sent.
 */
export default async function TagAliasLayout({
	children,
	params
}: {
	children: React.ReactNode;
	params: Promise<{ tags: string[]; locale: string }>;
}) {
	const { tags, locale } = await params;
	if (!(await resolveTagAlias(tags, locale))) {
		notFound();
	}
	return children;
}
