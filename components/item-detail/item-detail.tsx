'use client';
import { Suspense } from 'react';
import { ItemBreadcrumb } from './breadcrumb';
import { ItemIcon } from './item-icon';
import { slugify } from '@/lib/utils/slug';
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

	// Generate Product schema for SEO
	const productSchema = generateProductSchema({
		name: meta.name,
		description: meta.description,
		image: meta.icon_url,
		url: `${siteConfig.url}/${locale}/items/${meta.slug}`,
		category: categoryName,
		sourceUrl: meta.source_url,
		brandName: siteConfig.brandName
	});

	// Generate Breadcrumb schema for SEO
	const breadcrumbItems: BreadcrumbItem[] = [
		{
			name: t('common.HOME'),
			url: `${siteConfig.url}/${locale}`
		}
	];

	// Add category breadcrumb if categories are enabled and category exists
	if (categoriesEnabled && categoryName) {
		breadcrumbItems.push({
			name: toTitleCase(categoryName),
			url: `${siteConfig.url}/${locale}/categories/${slugify(categoryName)}`
		});
	}

	// Add current item
	breadcrumbItems.push({
		name: meta.name,
		url: `${siteConfig.url}/${locale}/items/${meta.slug}`
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
							<div className="mb-8 transform transition-all duration-500 hover:scale-[1.01]">
								<ItemBreadcrumb name={meta.name} category={meta.category} categoryName={categoryName} />
							</div>

							<div className="flex items-center gap-6 mb-8 group">
								<div className="relative transform transition-all duration-300 group-hover:scale-105">
									<div className="absolute inset-0 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
									<div className="relative">
										<ItemIcon iconUrl={meta.icon_url} name={meta.name} />
										<div className="absolute -bottom-1 -right-1 w-4 h-4 bg-linear-to-r from-green-400 to-emerald-500 rounded-full border-2 border-white dark:border-gray-900 shadow-lg animate-pulse" />
									</div>
								</div>
								<div className="flex-1">
									<div className="flex items-center gap-2">
										<h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-linear-to-r from-gray-900 via-theme-primary-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent tracking-tight leading-tight mb-2">
											{meta.name}
										</h1>
									</div>
									<div className="h-1 w-24 bg-linear-to-r from-theme-primary-500 to-theme-purple-500 rounded-full transform transition-all duration-500 group-hover:w-32"></div>
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

							<p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed max-w-4xl font-medium">
								{meta.description}
							</p>

							<div className="flex items-center space-x-4 mb-12">
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
									className="group inline-flex items-center px-6 py-3 bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
								/>

								<ShareButton url={meta.source_url || ''} title={meta.name} />
								<VoteButton
									itemId={meta.slug || meta.name}
									className="group inline-flex items-center px-6 py-3 bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
								/>
							</div>
						</div>

						<div className="bg-white/95 dark:bg-gray-900/95 rounded-2xl p-8 mb-8 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1">
							<div className="flex items-center gap-4 mb-6">
								<div className="p-3 bg-linear-to-br from-theme-primary-100 to-theme-purple-100 dark:from-theme-primary-900/30 dark:to-theme-purple-900/30 rounded-xl">
									<svg
										className="w-6 h-6 text-theme-primary-600 dark:text-theme-primary-400"
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
								<h2 className="text-2xl font-bold text-gray-800 dark:text-white">
									{t('itemDetail.ABOUT_THIS_TOOL')}
								</h2>
							</div>
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
						<div className="bg-white/95 dark:bg-gray-900/95 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1">
							<div className="flex items-center gap-4 mb-6">
								<div className="p-3 bg-linear-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl">
									<svg
										className="w-6 h-6 text-emerald-600 dark:text-emerald-400"
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
								<h2 className="text-xl font-bold text-gray-800 dark:text-white">
									{t('itemDetail.INFORMATION')}
								</h2>
							</div>
							<div className="space-y-4">
								<RatingDisplay itemId={meta.slug || meta.name} />

								{/* Publisher - Only show if defined */}
								{meta.publisher && (
									<div className="flex justify-between items-center p-4 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-all duration-300 group">
										<span className="text-gray-600 dark:text-gray-300 font-medium flex items-center gap-2">
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
												/>
											</svg>
											{t('itemDetail.PUBLISHER')}
										</span>
										<span className="flex items-center bg-linear-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 px-4 py-2 rounded-full border border-orange-200 dark:border-orange-700/50 group-hover:scale-105 transition-transform duration-300">
											<span className="w-3 h-3 rounded-full bg-linear-to-r from-orange-500 to-red-500 mr-2 animate-pulse"></span>
											<span className="font-semibold text-orange-700 dark:text-orange-300">{meta.publisher}</span>
										</span>
									</div>
								)}
								{/* Website - Only show if source_url exists */}
								{meta.source_url && (
									<div className="flex justify-between items-center p-4 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-all duration-300 group">
										<span className="text-gray-600 dark:text-gray-300 font-medium flex items-center gap-2">
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
												/>
											</svg>
											{t('itemDetail.WEBSITE')}
										</span>
										<a
											href={meta.source_url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-theme-primary-600 hover:text-theme-primary-700 dark:text-theme-primary-400 dark:hover:text-theme-primary-300 duration-300 font-semibold hover:underline group-hover:scale-105 transition-transform"
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
								<div className="flex justify-between items-center p-4 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-all duration-300 group">
									<span className="text-gray-600 dark:text-gray-300 font-medium flex items-center gap-2">
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
											/>
										</svg>
										{t('itemDetail.PUBLISHED')}
									</span>
									<span className="bg-linear-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 px-4 py-2 rounded-full font-semibold border border-green-200 dark:border-green-700/50 text-green-700 dark:text-green-300 group-hover:scale-105 transition-transform duration-300">
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
							<div className="bg-white/95 dark:bg-gray-900/95 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1">
								<div className="flex items-center gap-4 mb-6">
									<div className="p-3 bg-linear-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl">
										<svg
											className="w-6 h-6 text-green-600 dark:text-green-400"
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
									<h2 className="text-xl font-bold text-gray-800 dark:text-white">
										{t('itemDetail.PROMO_CODE')}
									</h2>
								</div>
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
							<div className="bg-white/95 dark:bg-gray-900/95 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1">
								<div className="flex items-center justify-between mb-6">
									<div className="flex items-center gap-4">
										<div className="p-3 bg-linear-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl">
											<svg
												className="w-6 h-6 text-purple-600 dark:text-purple-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												xmlns="http://www.w3.org/2000/svg"
												aria-label={t('listing.CATEGORIES')}
												role="img"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
												/>
											</svg>
										</div>
										<h2 className="text-xl font-bold text-gray-800 dark:text-white">
											{t('common.CATEGORY')}
										</h2>
									</div>
									<span className="text-xs bg-linear-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full font-semibold border border-purple-200 dark:border-purple-700/50">
										1 {t('common.ITEM')}
									</span>
								</div>
								<div className="flex flex-wrap gap-2">
									<a
										href={`/categories/${slugify(categoryName)}`}
										className="group relative px-5 py-3 bg-linear-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition-all duration-300 rounded-xl text-sm font-semibold flex items-center border border-purple-200/50 dark:border-purple-700/50 hover:border-purple-300 dark:hover:border-purple-600 transform hover:scale-105 overflow-hidden"
									>
										<div className="absolute inset-0 bg-linear-to-r from-transparent via-purple-200/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
										<span className="w-3 h-3 bg-linear-to-r from-purple-500 to-pink-500 rounded-full mr-3 group-hover:scale-125 transition-transform duration-300 relative z-10" />
										<span className="text-purple-700 dark:text-purple-300 relative z-10">
											{toTitleCase(categoryName)}
										</span>
									</a>
								</div>
							</div>
						)}

						{/* Tags - Only show if tags exist and tags are enabled */}
						{tagsEnabled && tagNames.length > 0 && (
							<div className="bg-white/95 dark:bg-gray-900/95 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1">
								<div className="flex items-center justify-between mb-6">
									<div className="flex items-center gap-4">
										<div className="p-3 bg-linear-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 rounded-xl">
											<svg
												className="w-6 h-6 text-cyan-600 dark:text-cyan-400"
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
										<h2 className="text-xl font-bold text-gray-800 dark:text-white">
											{t('listing.TAGS')}
										</h2>
									</div>
									<span className="text-xs bg-linear-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 text-cyan-700 dark:text-cyan-300 px-3 py-1 rounded-full font-semibold border border-cyan-200 dark:border-cyan-700/50">
										{tagNames.length} {tagNames.length === 1 ? t('common.ITEM') : t('common.ITEMS')}
									</span>
								</div>
								<div className="flex flex-wrap gap-2">
									{tagNames.map((tag, index) => (
										<a
											key={index}
											href={`/tags/${tag}`}
											className="group relative px-4 py-2 bg-linear-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 dark:from-cyan-900/20 dark:to-blue-900/20 dark:hover:from-cyan-900/30 dark:hover:to-blue-900/30 transition-all duration-300 rounded-lg text-sm font-semibold flex items-center border border-cyan-200/50 dark:border-cyan-700/50 hover:border-cyan-300 dark:hover:border-cyan-600 transform hover:scale-105 overflow-hidden"
										>
											<div className="absolute inset-0 bg-linear-to-r from-transparent via-cyan-200/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
											<span className="mr-2 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform duration-300 relative z-10">
												#
											</span>
											<span className="text-cyan-700 dark:text-cyan-300 relative z-10">
												{tag}
											</span>
										</a>
									))}
								</div>
							</div>
						)}

						{meta.allItems && meta.allItems.length > 0 && (
							<div className="bg-white/95 dark:bg-gray-900/95 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1">
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
