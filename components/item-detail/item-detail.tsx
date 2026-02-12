'use client';
import { Suspense } from 'react';
import { ItemBreadcrumb } from './breadcrumb';
import { ItemIcon } from './item-icon';
import { getVideoEmbedUrl, toTitleCase } from '@/lib/utils';
import { ShareButton } from './share-button';
import { CommentsSection } from './comments-section';
import { VoteButton } from './vote-button';
import { RatingDisplay } from './rating-display';
import ReportButton from '../report-button';
import { PromoCode } from '@/lib/content';
import { PromoCodeComponent } from '../promo-code/promo-code';
import { FavoriteButton } from '../favorite-button';
import type { ItemData } from '@/lib/content';
import type { ItemLocationData } from '@/lib/types/item';
import { SimilarItemsSection } from './similar-items-section';
import { LocationSection } from './LocationSection';
import { UserSurveySection } from '@/components/surveys/user-survey-section';
import { useTranslations } from 'next-intl';
import { generateProductSchema, generateBreadcrumbSchema, BreadcrumbItem } from '@/lib/seo/schema';
import { useParams } from 'next/navigation';
import { siteConfig } from '@/lib/config/client';
import { DEFAULT_LOCALE } from '@/lib/constants';
import { ItemCTAButton } from './item-cta-button';
import { useCategoriesEnabled } from '@/hooks/use-categories-enabled';
import { useSurveysEnabled } from '@/hooks/use-surveys-enabled';
import { useTagsEnabled } from '@/hooks/use-tags-enabled';
import { ItemDetailSkeleton } from '@/components/ui/skeleton';
import { Container } from '../ui/container';
import { SidebarSponsor, useSponsorAdsContext } from '@/components/sponsor-ads';

export interface ItemDetailProps {
	meta: {
		name: string;
		description: string;
		category: any;
		icon_url?: string;
		updated_at?: string;
		source_url?: string;
		tags?: Array<string | { name: string; id: string }>;
		video_url?: string;
		slug?: string;
		promo_code?: PromoCode;
		allItems?: ItemData[];
		action?: 'visit-website' | 'start-survey' | 'buy';
		showSurveys?: boolean;
		publisher?: string;
		location?: ItemLocationData;
	};
	renderedContent: React.ReactNode;
	categoryName: string;
}

function ItemDetailContent({ meta, renderedContent, categoryName }: ItemDetailProps) {
	const t = useTranslations();
	const params = useParams();
	const locale = params.locale as string;
	const { categoriesEnabled } = useCategoriesEnabled();
	const { surveysEnabled } = useSurveysEnabled();
	const { tagsEnabled } = useTagsEnabled();
	const { sponsors } = useSponsorAdsContext();
	const tagNames = Array.isArray(meta.tags) ? meta.tags.map((tag) => (typeof tag === 'string' ? tag : tag.name)) : [];
	const categoryId = typeof meta.category === 'string'
		? meta.category
		: (meta.category as { id?: string })?.id;
	const encodedCategory = encodeURIComponent(categoryId || categoryName);
	const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;

	// Generate Product schema for SEO
	const productSchema = generateProductSchema({
		name: meta.name,
		description: meta.description,
		image: meta.icon_url,
		url: `${siteConfig.url}${localePrefix}/items/${meta.slug}`,
		category: categoryName,
		sourceUrl: meta.source_url,
		brandName: siteConfig.brandName
	});

	// Generate Breadcrumb schema for SEO
	const breadcrumbItems: BreadcrumbItem[] = [
		{
			name: t('common.HOME'),
			url: `${siteConfig.url}${localePrefix}`
		}
	];

	// Add category breadcrumb if categories are enabled and category exists
	if (categoriesEnabled && categoryName) {
		breadcrumbItems.push({
			name: toTitleCase(categoryName),
			url: `${siteConfig.url}${localePrefix}/categories/${encodedCategory}`
		});
	}

	// Add current item
	breadcrumbItems.push({
		name: meta.name,
		url: `${siteConfig.url}${localePrefix}/items/${meta.slug}`
	});

	const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

	return (
		<div className="min-h-screen relative overflow-hidden">
			{/* Product Schema JSON-LD */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
			/>
			{/* Breadcrumb Schema JSON-LD */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
			/>
			<Container maxWidth="7xl" padding="default" useGlobalWidth className="relative z-10 py-8">
				<div className="flex flex-col lg:flex-row gap-8">
					{/* Left column */}
					<div className="lg:w-2/3">
						{/* Video Showcase */}
						<div className="mb-8">
							<div className="mb-6">
								<ItemBreadcrumb name={meta.name} category={meta.category} categoryName={categoryName} />
							</div>

							<div className="flex items-start gap-6 mb-8">
								<div className="flex-shrink-0">
									<ItemIcon iconUrl={meta.icon_url} name={meta.name} />
								</div>
								<div className="flex-1 min-w-0">
									<h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white tracking-tight mb-3">
										{meta.name}
									</h1>
								</div>
							</div>

							{/* Video Showcase - below title/meta, above description */}
							{meta.video_url && (
								<div className="mb-8">
									<div className="relative pb-[56.25%] h-0 overflow-hidden rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
										<iframe
											src={getVideoEmbedUrl(meta.video_url)}
											title={`Video Demo for ${meta.name}`}
											frameBorder="0"
											allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
											allowFullScreen
											className="absolute top-0 left-0 w-full h-full"
										></iframe>
									</div>
								</div>
							)}

							<p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
								{meta.description}
							</p>

							<div className="flex items-center flex-wrap gap-3 mb-12">
								<ItemCTAButton
									action={meta.action || 'visit-website'}
									sourceUrl={meta.source_url}
									itemSlug={meta.slug}
								/>

								{/* Favorite Button */}
								<FavoriteButton
									itemSlug={meta.slug || ''}
									itemName={meta.name}
									itemIconUrl={meta.icon_url}
									itemCategory={
										Array.isArray(meta.category)
											? typeof meta.category[0] === 'string'
												? meta.category[0]
												: meta.category[0]?.name
											: typeof meta.category === 'string'
												? meta.category
												: meta.category?.name
									}
									variant="heart"
									size="lg"
									showText={true}
									className="inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors border border-gray-200 dark:border-gray-800 shadow-sm"
								/>

								<ShareButton url={meta.source_url || ''} title={meta.name} />
								<VoteButton
									itemId={meta.slug || meta.name}
									className="inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors border border-gray-200 dark:border-gray-800 shadow-sm"
								/>
							</div>
						</div>

						<div className="bg-white dark:bg-gray-900 rounded-xl p-8 mb-8 border border-gray-200 dark:border-gray-800 shadow-sm">
									<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
									{t('itemDetail.ABOUT_THIS_TOOL')}
								</h2>
							<div className="prose prose-gray dark:prose-invert prose-lg max-w-none">
								{renderedContent}
								<div className="flex justify-end mt-6">
									<ReportButton contentType="item" contentId={meta.slug || meta.name} />
								</div>
							</div>
						</div>

						{/* Location Section */}
						<LocationSection location={meta.location} itemName={meta.name} itemSlug={meta.slug || ''} />

						{/* Surveys Section - Only show if showSurveys is not false and surveys are enabled */}
						{meta.showSurveys !== false && surveysEnabled && (
							<UserSurveySection
								item={meta}
							/>
						)}

						{/* Comments Section */}
						<div className="mt-8">
							<CommentsSection itemId={meta.slug || meta.name} />
						</div>

					</div>

					{/* Right column */}
					<div className="lg:w-1/3 space-y-6">
						<div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
									<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
									{t('itemDetail.INFORMATION')}
								</h2>
							<div className="space-y-4">
								<RatingDisplay itemId={meta.slug || meta.name} />

								{/* Publisher - Only show if defined */}
								{meta.publisher && (
									<div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
										<span className="text-sm text-gray-600 dark:text-gray-400">
											{t('itemDetail.PUBLISHER')}
										</span>
										<span className="text-sm font-medium text-gray-900 dark:text-white">{meta.publisher}</span>
									</div>
								)}
								{/* Website - Only show if source_url exists */}
								{meta.source_url && (
									<div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
										<span className="text-sm text-gray-600 dark:text-gray-400">
											{t('itemDetail.WEBSITE')}
										</span>
										<a
											href={meta.source_url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-sm font-medium text-theme-primary-600 hover:text-theme-primary-700 dark:text-theme-primary-500 dark:hover:text-theme-primary-400"
										>
											{(() => {
												try {
													return new URL(meta.source_url).hostname;
												} catch {
													return 'N/A';
												}
											})()}
										</a>
									</div>
								)}
								<div className="flex justify-between items-center py-3">
									<span className="text-sm text-gray-600 dark:text-gray-400">
										{t('itemDetail.PUBLISHED')}
									</span>
									<span className="text-sm font-medium text-gray-900 dark:text-white">
										{meta.updated_at
											? new Date(meta.updated_at).toLocaleDateString('en-US', {
												year: 'numeric',
												month: 'short',
												day: 'numeric'
											})
											: 'N/A'}
									</span>
								</div>
							</div>
						</div>

						{/* Promo Code Section */}
						{meta.promo_code && (
							<div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
								<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
									{t('itemDetail.PROMO_CODE')}
								</h2>
								<PromoCodeComponent
									promoCode={meta.promo_code}
									variant="featured"
									showDescription={true}
									showTerms={true}
									onCodeCopied={(code) => {
										if (typeof window !== 'undefined' && (window as any).gtag) {
											(window as any).gtag('event', 'promo_code_copied', {
												event_category: 'engagement',
												event_label: code,
												item_name: meta.name,
												page_location: window.location.href
											});
										}
									}}
								/>
							</div>
						)}

						{/* Sponsor Ads Section */}
						{sponsors.length > 0 && (
							<SidebarSponsor sponsors={sponsors} rotationInterval={5000} />
						)}

						{/* Categories - Only show if categories enabled and category exists */}
						{categoriesEnabled && categoryName && (
							<div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
									<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
										{t('common.CATEGORY')}
									</h2>
								<div className="flex flex-wrap gap-2">
									<a
										href={`/categories/${encodedCategory}`}
										className="inline-flex items-center px-3 py-2 text-xs font-semibold rounded-full bg-linear-to-r from-theme-primary-100 to-theme-primary-100 text-theme-primary dark:from-theme-primary-900/30 dark:to-theme-primary-900/30 dark:text-theme-primary border border-theme-primary-10 dark:border-gray-600/30 transition-all duration-300 hover:shadow-md capitalize shadow-xs"
									>
										{toTitleCase(categoryName)}
									</a>
								</div>
							</div>
						)}

						{/* Tags - Only show if tags exist and tags are enabled */}
						{tagsEnabled && tagNames.length > 0 && (
							<div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
								<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
									{t('listing.TAGS')}
								</h2>
								<div className="flex flex-wrap gap-1">
									{tagNames.map((tag, index) => (
										<a
												key={index}
												href={`/tags/${tag}`}
												className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300"
											>
												#{tag}
											</a>
									))}
								</div>
							</div>
						)}

						{meta.allItems && meta.allItems.length > 0 && (
							<div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
								<div className="mt-8">
									<SimilarItemsSection allItems={meta.allItems} />
								</div>
							</div>
						)}
					</div>
				</div>
			</Container>
		</div>
	);
}

export function ItemDetail({ meta, renderedContent, categoryName }: ItemDetailProps) {
	return (
		<Suspense fallback={<ItemDetailSkeleton />}>
			<ItemDetailContent meta={meta} renderedContent={renderedContent} categoryName={categoryName} />
		</Suspense>
	);
}
