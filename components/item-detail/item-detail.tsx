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
import { Container, useContainerWidth } from '../ui/container';
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
	const containerWidth = useContainerWidth();
	const isFluid = containerWidth === 'fluid';
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
				<div className={`flex flex-col lg:flex-row mb-6 lg:mb-20 ${isFluid ? 'gap-4 lg:gap-20' : 'gap-8'}`}>
					{/* Left column */}
					<div className={isFluid ? 'lg:w-[65%]' : 'lg:w-2/3'}>
						{/* Video Showcase */}
						<div className="mb-8">
							<div className="mb-6">
								<ItemBreadcrumb name={meta.name} category={meta.category} categoryName={categoryName} />
							</div>

							<div className="flex items-center gap-6 my-8">
								<div className="shrink-0">
									<ItemIcon iconUrl={meta.icon_url} name={meta.name} />
								</div>
								<div className="flex-1 min-w-0">
									<h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-gray-900 via-theme-primary-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent tracking-tight leading-tight mb-2">
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

							<p className={`${isFluid ? 'w-5/6' :"full"} text-base text-gray-600 dark:text-gray-400 mb-8 leading-relaxed`}>
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
									className="inline-flex cursor-pointer items-center px-6 py-2 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md font-medium transition-colors border border-gray-200 dark:border-gray-800 shadow-sm"
								/>

								<ShareButton url={meta.source_url || ''} title={meta.name} />
								<VoteButton
									itemId={meta.slug || meta.name}
									className="inline-flex items-center cursor-pointer px-6 py-2 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md font-medium transition-colors border border-gray-200 dark:border-gray-800 shadow-sm"
								/>
							</div>
						</div>

						<div className="">
							<h2 className="text-xl md:text-2xl font-semibold mb-6 bg-[linear-gradient(90deg,rgb(99,102,241),rgba(168,85,247,0.8))] bg-clip-text text-transparent">
								{t('itemDetail.ABOUT_THIS_TOOL')}
							</h2>
							<div className="prose prose-gray dark:prose-invert prose-lg max-w-none">
								<div>
								{renderedContent}
								</div>
								<div className="flex justify-start mt-6">
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
					<div className={`${isFluid ? 'lg:w-[25%] lg:flex-shrink-0' : 'lg:w-1/3'} space-y-6 relative`}>
						<div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
							<div className="flex items-center gap-4 mb-6">
								<div className="p-1.5 bg-linear-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl">
									<svg
										className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										></path>
									</svg>
								</div>
								<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
									{t('itemDetail.INFORMATION')}
								</h2>
							</div>
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
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-4 mb-6">
										<div className="p-1.5 bg-linear-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl">
											<svg
												className="w-4 h-4 text-green-600 dark:text-green-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
												/>
											</svg>
										</div>
										<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
											{t('common.CATEGORY')}
										</h2>
									</div>
									<span className="text-xs text-gray-500">
										1 {t('common.ITEM')}
									</span>
								</div>
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
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-4">
										<div className="p-1.5 bg-linear-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 rounded-xl">
											<svg
												className="w-4 h-4 text-cyan-600 dark:text-cyan-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												xmlns="http://www.w3.org/2000/svg"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
												></path>
											</svg>
										</div>
									<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
										{t('listing.TAGS')}
									</h2>
									</div>
									<span className="text-xs text-gray-500">
										{tagNames.length} {tagNames.length === 1 ? t('common.ITEM') : t('common.ITEMS')}
									</span>
								</div>
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
							<div className="mt-10">
								<SimilarItemsSection allItems={meta.allItems} />
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
