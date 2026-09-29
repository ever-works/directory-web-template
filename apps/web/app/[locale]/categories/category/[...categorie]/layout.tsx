import { notFound } from 'next/navigation';
import { resolveCategoryAlias } from './resolve-category-alias';

/**
 * Real 404s for this route. Its loading.tsx wraps page.tsx in a Suspense
 * boundary, so a notFound() thrown in the page (or its metadata) came after the
 * 200 status line had been streamed: an unknown category, or a URL that is not
 * one of the category's pages, answered 200 with a `noindex` not-found page (a
 * soft 404). A layout renders OUTSIDE its own segment's loading boundary, so
 * the same lookup here fails before any byte of the response is sent.
 */
export default async function CategoryAliasLayout({
	children,
	params
}: {
	children: React.ReactNode;
	params: Promise<{ categorie: string[]; locale: string }>;
}) {
	const { categorie, locale } = await params;
	if (!(await resolveCategoryAlias(categorie, locale))) {
		notFound();
	}
	return children;
}
