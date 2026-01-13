import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PageContainer } from '@/components/ui/container';
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/breadcrumb';
import { MDX } from '@/components/mdx';
import { getCachedPageContent } from '@/lib/content';
import { cleanUrl } from '@/lib/utils/url-cleaner';
import { formatDisplayName } from '@/components/filters/utils/text-utils';
import { siteConfig } from '@/lib/config';

interface PageProps {
	params: Promise<{ slug: string; locale: string }>;
}

// Enable ISR with 10 minutes revalidation
// dynamicParams allows on-demand generation for any slug
export const revalidate = 600;
export const dynamicParams = true;

const rawUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';
const baseUrl = cleanUrl(rawUrl);

/**
 * Extracts page title from metadata or generates it from slug
 * @param metadata - Page metadata object
 * @param slug - Page slug as fallback
 * @returns Formatted page title
 */
function getPageTitle(metadata: Record<string, unknown> | undefined, slug: string): string {
	if (metadata?.title && typeof metadata.title === 'string') {
		return metadata.title;
	}
	return formatDisplayName(slug);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug, locale } = await params;
	const pageData = await getCachedPageContent(slug, locale);

	if (!pageData) {
		notFound();
	}

	const title = getPageTitle(pageData.metadata, slug);
	const description = (pageData.metadata?.description as string) || '';

	return {
		title,
		description,
		openGraph: {
			title,
			description,
			url: `${baseUrl}/${locale}/pages/${slug}`,
			siteName: siteConfig.name,
			locale,
			type: 'website'
		},
		twitter: {
			card: 'summary_large_image',
			title,
			description
		}
	};
}

export default async function DynamicPage({ params }: PageProps) {
	const { slug, locale } = await params;
	const t = await getTranslations('common');
	const pageData = await getCachedPageContent(slug, locale);

	if (!pageData) {
		return notFound();
	}

	const { content, metadata } = pageData;
	const title = getPageTitle(metadata, slug);

	const breadcrumbItems: BreadcrumbItem[] = [
		{
			label: title
		}
	];

	return (
		<PageContainer className="py-8 sm:py-12 md:py-16">
			<Breadcrumb items={breadcrumbItems} homeLabel={t('HOME')} />

			<article className="prose prose-lg dark:prose-invert max-w-none">
				{content ? (
					<MDX source={content} />
				) : (
					<p className="text-gray-500 dark:text-gray-400">{t('NO_CONTENT_PROVIDED')}</p>
				)}
			</article>
		</PageContainer>
	);
}
