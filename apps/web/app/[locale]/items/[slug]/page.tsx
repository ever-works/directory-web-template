import { getCachedItem, fetchSimilarItems } from '@/lib/content';
import { notFound } from 'next/navigation';
import { getCategoriesName } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import { ItemDetailWrapper } from '@/components/item-detail';
import { ServerItemContent } from '@/components/item-detail/server-item-content';
import { Container } from '@/components/ui/container';
import { ItemViewTracker } from '@/components/tracking/item-view-tracker';
import { Metadata } from 'next';
import { siteConfig } from '@/lib/config';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { generateItemHreflangAlternates, getLocalizedUrl } from '@/lib/seo/hreflang';
import { type Locale } from '@/lib/constants';

// Enable ISR with 10 minutes revalidation
// Using dynamicParams allows on-demand generation without build-time MDX errors
export const revalidate = 600;
export const dynamicParams = true;

const appUrl = getBaseUrl();

/**
 * Generate metadata for item detail pages
 * Includes: title, description, Open Graph, Twitter Cards, canonical URL
 */
export async function generateMetadata({
	params
}: {
	params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
	const { slug, locale } = await params;

	try {
		const item = await getCachedItem(slug, { lang: locale });

		if (!item) {
			return {
				metadataBase: new URL(appUrl),
				title: `Item Not Found | ${siteConfig.name}`,
				description: "The item you're looking for doesn't exist.",
				robots: {
					index: false,
					follow: false
				}
			};
		}

		const { meta } = item;

		// Extract keywords from tags
		const keywords = Array.isArray(meta.tags)
			? meta.tags.map((tag) => (typeof tag === 'string' ? tag : tag.name))
			: [];

		// Truncate description to 160 characters for meta description
		const MAX_DESCRIPTION_LENGTH = 160;
		const metaDescription = meta.description
			? meta.description.length > MAX_DESCRIPTION_LENGTH
				? `${meta.description.slice(0, MAX_DESCRIPTION_LENGTH - 3)}...`
				: meta.description
			: `Discover ${meta.name} on ${siteConfig.name}`;

		// Use dynamic OG image endpoint, with fallback to icon or logo
		const ogImageUrl = new URL(`/${locale}/items/${slug}/opengraph-image`, appUrl).toString();
		const fallbackImageUrl = new URL(meta.icon_url ?? siteConfig.logo, appUrl).toString();

		return {
			metadataBase: new URL(appUrl),
			title: `${meta.name} | ${siteConfig.name}`,
			description: metaDescription,
			keywords,
			openGraph: {
				title: meta.name,
				description: meta.description || metaDescription,
				images: [
					{
						url: ogImageUrl,
						width: 1200,
						height: 630,
						alt: meta.name
					},
					{
						url: fallbackImageUrl,
						alt: `${meta.name} icon`
					}
				],
				type: 'website',
				siteName: siteConfig.name,
				url: getLocalizedUrl(`/items/${slug}`, locale as Locale)
			},
			twitter: {
				card: 'summary_large_image',
				title: meta.name,
				description: metaDescription,
				images: [ogImageUrl, fallbackImageUrl]
			},
			alternates: {
				canonical: getLocalizedUrl(`/items/${slug}`, locale as Locale),
				languages: generateItemHreflangAlternates(slug)
			}
		};
	} catch (error) {
		console.error(`Failed to generate metadata for item ${slug}:`, error);
		return {
			metadataBase: new URL(appUrl),
			title: `Error | ${siteConfig.name}`,
			description: 'An error occurred while loading this page.',
			robots: {
				index: false,
				follow: false
			}
		};
	}
}

// Remove generateStaticParams to prevent build-time MDX compilation
// export async function generateStaticParams() {
//   const params = LOCALES.map(async (locale) => {
//     try {
//       const { items } = await fetchItems({ lang: locale });
//       return items.map((item) => ({ slug: item.slug, locale }));
//     } catch (error) {
//       console.error(`Failed to generate static params for locale ${locale}:`, error);
//       return [];
//     }
//   });

//   return (await Promise.all(params)).flat();
// }

export default async function ItemDetails({ params }: { params: Promise<{ slug: string; locale: string }> }) {
	const { slug, locale } = await params;

	try {
		const item = await getCachedItem(slug, { lang: locale });

		if (!item) {
			return notFound();
		}

		const t = await getTranslations('common');

		const { meta, content } = item;
		const categoryName = getCategoriesName(meta.category);
		const similarItems = await fetchSimilarItems(meta, 6, { lang: locale }).then((items) =>
			items.flatMap((item) => item.item)
		);

		const metaWithVideo = {
			...meta,
			video_url: '', // e.g. https://www.youtube.com/watch?v=eDqfg_LexCQ,
			allItems: similarItems
		};

		// Render the MDX content on the server
		const renderedContent = <ServerItemContent content={content} noContentMessage={t('NO_CONTENT_PROVIDED')} />;

		return (
			<div className='relative overflow-hidden dark:bg-[#0a0a0a] text-gray-800 dark:text-white'>
				{/* <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_50%)]"></div>
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.1),transparent_50%)]"></div> */}
				<Container maxWidth="7xl" padding="default" useGlobalWidth>
					<ItemViewTracker slug={slug} />
					<ItemDetailWrapper meta={metaWithVideo} renderedContent={renderedContent} categoryName={categoryName} />
				</Container>
			</div>
		);
	} catch (error) {
		console.error(`Failed to load item ${slug} for locale ${locale}:`, error);
		return notFound();
	}
}
