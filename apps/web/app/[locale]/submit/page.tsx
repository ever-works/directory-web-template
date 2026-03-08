import { getCachedItems } from '@/lib/content';
import { SubmitFormClient } from '@/components/submit/submit-form-client';
import { cn } from '@/lib/utils';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { generateHreflangAlternates, getLocalizedUrl } from '@/lib/seo/hreflang';
import { siteConfig } from '@/lib/config';
import { Locale } from '@/lib/constants';

export const revalidate = 600;

export async function generateMetadata({
	params
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: 'common' });
    const tDirectory = await getTranslations({ locale, namespace: 'directory.DETAILS_FORM' });

	const path = '/submit';
	const title = `${t('SUBMIT')} | ${siteConfig.name}`;
	const description = tDirectory('DESCRIPTION');

	return {
		title,
		description,
		openGraph: {
			title,
			description,
			type: 'website',
			url: getLocalizedUrl(path, locale as Locale),
			siteName: siteConfig.name
		},
		alternates: {
			canonical: getLocalizedUrl(path, locale as Locale),
			languages: generateHreflangAlternates(path)
		}
	};
}

export default async function SubmitPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const { items, categories, tags } = await getCachedItems({
		lang: locale
	});

	return (
		<div
			className={cn(
				'w-full min-h-screen bg-white dark:bg-[#0b111f]',
			)}
		>
			<SubmitFormClient
				initialData={{
					items,
					categories,
					tags
				}}
				locale={locale}
			/>
		</div>
	);
}
