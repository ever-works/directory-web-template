'use client';

import { useLocale } from 'next-intl';
import NotFoundContent from '@/components/errors/not-found-content';

/**
 * 404 for `notFound()` inside `[locale]` (an unknown item, tag or category).
 * Rendered within `[locale]/layout.tsx`, which owns the document shell since
 * Spec 061, so a 404 under `/ar/...` or `/he/...` keeps its `lang` and RTL
 * `dir`, and its links keep the locale. The root `app/not-found.tsx` (default
 * locale) is left for paths outside `[locale]`.
 */
export default function LocaleNotFound() {
	const locale = useLocale();
	return <NotFoundContent locale={locale} />;
}
