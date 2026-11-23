import { getCachedItem, getCachedSimilarItems } from '@/lib/content';
import { isItemSlug, MAX_ITEM_SLUG_LENGTH } from '@/lib/item-slug';
import { notFound, unstable_rethrow } from 'next/navigation';
import { getCategoriesName } from '@/lib/utils';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ItemDetailWrapper } from '@/components/item-detail';
import { ServerItemContent } from '@/components/item-detail/server-item-content';
import { Container } from '@/components/ui/container';
import { ItemViewTracker } from '@/components/tracking/item-view-tracker';
import { Metadata } from 'next';
import { siteConfig } from '@/lib/config';
import { getSiteName } from '@/lib/seo/site-identity';
import { itemDescription, itemTitle } from '@/lib/seo/meta-text';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { generateItemHreflangAlternates, getLocalizedUrl } from '@/lib/seo/hreflang';
import { type Locale } from '@/lib/constants';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { getCommentsByItemId } from '@/lib/db/queries';
import { getTenantIdForSharedRender } from '@/lib/auth/tenant';
import { extractHeadings } from '@/lib/utils/extract-headings';
import { ratingWhenEnabled, summarizeRatings } from '@/lib/seo/aggregate-rating';
import { getFeatureFlags } from '@/lib/config/feature-flags';

// Enable ISR with 10 minutes revalidation
// Using dynamicParams allows on-demand generation without build-time MDX errors
export const revalidate = 600;
export const dynamicParams = true;

// An empty list makes every item page ISR: rendered on its first visit, then
// served from the cache (and cacheable by a CDN) until `revalidate` or a content
// sync. Without generateStaticParams Next.js renders a dynamic segment on every
// request, which is what made localized item pages slow under crawler load
// (Spec 061). Nothing in this route may read cookies() / headers().
export async function generateStaticParams() {
	return [];
}

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

	// See the note on MAX_ITEM_SLUG_LENGTH (lib/item-slug.ts) — short-circuit before the
	// git-CMS lookup so a 2KB slug returns a clean noindex envelope
	// instead of crashing inside `realpath`.
	if (slug.length > MAX_ITEM_SLUG_LENGTH) {
		return {
			metadataBase: new URL(appUrl),
			title: `Not Found | ${await getSiteName()}`,
			description: '',
			robots: { index: false, follow: false }
		};
	}

	try {
		const item = await getCachedItem(slug, { lang: locale });

		if (!item) {
			return {
				metadataBase: new URL(appUrl),
				title: `Item Not Found | ${await getSiteName()}`,
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

		// "<Item> – <Category> | <Site>" and a description cut on a word boundary
		// near 155 characters from the item's own text (lib/seo/meta-text.ts,
		// Spec 062); an item without one gets a factual sentence, never a claim.
		const siteName = await getSiteName();
		// The first category only; none for `category: []` or a missing value
		// (getCategoriesName reads `.name` and would throw on undefined).
		const firstCategory = Array.isArray(meta.category) ? meta.category[0] : meta.category;
		const primaryCategory = firstCategory ? getCategoriesName(firstCategory as never) : '';
		const pageTitle = itemTitle({ name: meta.name, category: primaryCategory });
		const metaDescription = itemDescription({
			name: meta.name,
			category: primaryCategory,
			siteName,
			description: meta.description
		});

		// Use dynamic OG image endpoint, with fallback to icon or logo
		// Unprefixed for the default locale: `/en/...` answers a redirect.
		const ogImageUrl = getLocalizedUrl(`/items/${slug}/opengraph-image`, locale as Locale);
		const fallbackImageUrl = new URL(meta.icon_url ?? siteConfig.logo, appUrl).toString();

		return {
			metadataBase: new URL(appUrl),
			title: `${pageTitle} | ${siteName}`,
			description: metaDescription,
			keywords,
			openGraph: {
				title: pageTitle,
				description: metaDescription,
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
				siteName,
				url: getLocalizedUrl(`/items/${slug}`, locale as Locale)
			},
			twitter: {
				card: 'summary_large_image',
				title: pageTitle,
				description: metaDescription,
				images: [ogImageUrl, fallbackImageUrl]
			},
			alternates: {
				canonical: getLocalizedUrl(`/items/${slug}`, locale as Locale),
				languages: generateItemHreflangAlternates(slug),
				types: {
					'text/markdown': `${getLocalizedUrl(`/items/${slug}`, locale as Locale)}.md`
				}
			}
		};
	} catch (error) {
		console.error(`Failed to generate metadata for item ${slug}:`, error);
		return {
			metadataBase: new URL(appUrl),
			title: `Error | ${await getSiteName()}`,
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
	// Sets the request locale for next-intl's server helpers, so they do not read it
	// from the request headers, which makes a page render per request (Spec 061).
	setRequestLocale(locale);

	// A slug that cannot name an item is a 404, not a read failure (the catch below rethrows those).
	if (slug.length > MAX_ITEM_SLUG_LENGTH || !isItemSlug(slug)) {
		return notFound();
	}

	try {
		const queryClient = getQueryClient();

		// Run item CMS fetch, i18n load, and comment prefetch all in parallel.
		// Comment prefetch populates the server-side queryClient so HydrationBoundary
		// below embeds the data in the HTML — CommentsSection renders without a
		// client-side waterfall.
		// The page is cached and shared by every visitor, so the comments are read for the
		// tenant resolved without the request. When that is ambiguous (several tenants in one
		// deployment) nothing is prefetched and the browser loads them through the API.
		// Without a prefetch (several tenants) the Product JSON-LD also has no aggregateRating:
		// the rating is summarised from these comments, and tenant safety comes first.
		const commentsPrefetch = getTenantIdForSharedRender()
			.catch(() => null)
			.then((sharedTenantId) =>
				sharedTenantId
					? queryClient.prefetchQuery({
							queryKey: ['comments', slug],
							queryFn: () => getCommentsByItemId(slug, { tenantId: sharedTenantId }).catch(() => []),
						})
					: undefined
			);
		const [[item, t]] = await Promise.all([
			Promise.all([getCachedItem(slug, { lang: locale }), getTranslations('common')]),
			commentsPrefetch,
		]);

		if (!item) {
			return notFound();
		}

		const { meta, content } = item;
		// Reuse the comments just prefetched above: no extra query for the Product JSON-LD.
		// No aggregateRating while the ratings feature is off: the page then shows no rating (spec 057 R4).
		const prefetchedComments = queryClient.getQueryData<Array<{ rating: unknown }>>(['comments', slug]);
		const rating = ratingWhenEnabled(
			summarizeRatings((prefetchedComments ?? []).map((comment) => comment.rating)),
			getFeatureFlags().ratings
		);
		const categoryName = getCategoriesName(meta.category);
		const headings = extractHeadings(content ?? '');

		// Similar items scan and score the *entire* catalogue, but only feed the
		// "Similar Products" carousel at the very bottom of the page. We do NOT
		// await it here: awaiting blocks the whole HTML response (blank first
		// paint) on work that's below the fold. Instead we pass the promise down
		// and let the carousel stream in behind its own Suspense boundary, so the
		// hero + content + sidebar paint immediately. `getCachedSimilarItems`
		// still persists the scored result in Next's Data Cache.
		const similarItemsPromise = getCachedSimilarItems(meta, 6, { lang: locale }).then((items) =>
			items.flatMap((similar) => similar.item)
		);

		const metaWithVideo = {
			...meta,
			video_url: '' // e.g. https://www.youtube.com/watch?v=eDqfg_LexCQ,
		};

		// Render the MDX content on the server
		const renderedContent = <ServerItemContent content={content} noContentMessage={t('NO_CONTENT_PROVIDED')} />;

		return (
			<HydrationBoundary state={dehydrate(queryClient)}>
				<div className='relative overflow-hidden dark:bg-[#0a0a0a] text-gray-800 dark:text-white'>
					{/* <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_50%)]"></div>
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.1),transparent_50%)]"></div> */}
					<Container maxWidth="7xl" padding="default" useGlobalWidth>
						<ItemViewTracker slug={slug} />
						<ItemDetailWrapper
							meta={metaWithVideo}
							renderedContent={renderedContent}
							categoryName={categoryName}
							similarItemsPromise={similarItemsPromise}
							headings={headings}
							rating={rating}
							siteUrl={appUrl}
						/>
					</Container>
				</div>
			</HydrationBoundary>
		);
	} catch (error) {
		// notFound() and Next's other control-flow errors pass through untouched.
		unstable_rethrow(error);
		console.error(`Failed to load item ${slug} for locale ${locale}:`, error);
		// Not notFound(): the page is cached (ISR). A regeneration that throws keeps the
		// last good page; a 404 would replace it until the next regeneration (Spec 061).
		throw error;
	}
}
