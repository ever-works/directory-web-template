'use client';
import { Suspense } from 'react';
import { ItemBreadcrumb } from './breadcrumb';
import { ItemIcon } from './item-icon';
import { getVideoEmbedUrl, toTitleCase, slugify, cn } from '@/lib/utils';
// ShareButton and VoteButton replaced by compact, inline actions in this view
import { Globe, Share2, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { useItemVote } from '@/hooks/use-item-vote';
import { CommentsSection } from './comments-section';
// VoteButton replaced by CompactVote in this file
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
// ItemCTAButton not used in compact layout
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
	const firstCategory = Array.isArray(meta.category) ? meta.category[0] : meta.category;
	const rawCategoryId = typeof firstCategory === 'string'
		? firstCategory
		: (firstCategory as { id?: string })?.id;
	const encodedCategory = encodeURIComponent(slugify(rawCategoryId || categoryName));
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
		<div className="min-h-screen bg-gray-50/40 dark:bg-transparent">
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
			<Container maxWidth="7xl" padding="default" useGlobalWidth className="py-8 lg:py-12">
				{/* Breadcrumb row */}
				<div className="mb-8">
					<ItemBreadcrumb name={meta.name} category={meta.category} categoryName={categoryName} />
				</div>

				<div className={`flex flex-col lg:flex-row ${isFluid ? 'gap-8 lg:gap-16 lg:w-[92%] lg:mx-auto' : 'gap-10 lg:gap-14'}`}>
					{/* ── Left column ─────────────────────────────────────── */}
					<div className={isFluid ? 'lg:w-[65%] min-w-0' : 'lg:w-2/3 min-w-0'}>

						{/* Hero header */}
						<div className="flex items-start gap-5 mb-6">
							<div className="shrink-0 mt-0.5">
								<ItemIcon iconUrl={meta.icon_url} name={meta.name} />
							</div>
							<div className="flex-1 min-w-0">
								<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight mb-2">
									{meta.name}
								</h1>
								<p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
									{meta.description}
								</p>
							</div>
						</div>

						{/* Action bar */}
						<div className="flex items-center gap-2 mb-8 pb-8 border-b border-gray-200 dark:border-white/8">
							<a
								href={meta.source_url || '#'}
								target="_blank"
								rel="noreferrer"
								title={t('common.VISIT_WEBSITE')}
								className="inline-flex items-center gap-2 h-9 px-4 text-xs font-semibold rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors duration-150 shadow-sm"
							>
								<Globe className="w-3.5 h-3.5" />
								{t('common.VISIT_WEBSITE')}
							</a>

							<div className="h-5 w-px bg-gray-200 dark:bg-white/10 mx-1" />

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
								size="sm"
								showText={false}
								className="w-9 h-9 p-0 rounded-lg border border-gray-200 dark:border-white/8 bg-white dark:bg-white/3 hover:bg-gray-50 dark:hover:bg-white/6 transition-colors"
							/>

							<button
								type="button"
								title={t('common.SHARE')}
								onClick={async (e) => {
									e.preventDefault();
									try {
										await navigator.clipboard.writeText(meta.source_url || window.location.href);
										toast.success(t('common.LINK_COPIED'));
									} catch {
										toast.error(t('common.SHARE_ERROR'));
									}
								}}
								className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-white dark:bg-white/3 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/8 hover:bg-gray-50 dark:hover:bg-white/6 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150"
							>
								<Share2 className="w-4 h-4" />
							</button>

							<CompactVote itemId={meta.slug || meta.name} />
						</div>

						{/* Video embed */}
						{meta.video_url && (
							<div className="mb-10">
								<div className="relative pb-[56.25%] h-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-white/8 shadow-sm">
									<iframe
										src={getVideoEmbedUrl(meta.video_url)}
										title={`Video Demo for ${meta.name}`}
										frameBorder="0"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
										allowFullScreen
										className="absolute top-0 left-0 w-full h-full"
									/>
								</div>
							</div>
						)}

						{/* Main content body */}
						<div className="prose-container">
							{renderedContent}
							<div className="flex justify-start mt-8 pt-6 border-t border-gray-100 dark:border-white/6">
								<ReportButton contentType="item" contentId={meta.slug || meta.name} />
							</div>
						</div>

						{/* Location */}
						<div className="mt-10">
							<LocationSection location={meta.location} itemName={meta.name} itemSlug={meta.slug || ''} />
						</div>

						{/* Surveys */}
						{meta.showSurveys !== false && surveysEnabled && (
							<div className="mt-10">
								<UserSurveySection item={meta} />
							</div>
						)}

						{/* Comments */}
						<div className="mt-10">
							<CommentsSection itemId={meta.slug || meta.name} />
						</div>
					</div>

					{/* ── Right / Sidebar column ──────────────────────────── */}
					<div className={`${isFluid ? 'lg:w-[25%] lg:shrink-0' : 'lg:w-[320px] shrink-0'} space-y-4`}>

						{/* Information card */}
						<div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/8 overflow-hidden">
							<div className="px-5 py-4 border-b border-gray-100 dark:border-white/6">
								<h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
									{t('itemDetail.INFORMATION')}
								</h2>
							</div>
							<div className="px-5 py-3 divide-y divide-gray-100 dark:divide-white/6">
								<div className="py-2">
									<RatingDisplay itemId={meta.slug || meta.name} />
								</div>

								{meta.publisher && (
									<div className="flex justify-between items-center py-3">
										<span className="text-xs text-gray-500 dark:text-gray-400">
											{t('itemDetail.PUBLISHER')}
										</span>
										<span className="text-xs font-medium text-gray-900 dark:text-white">{meta.publisher}</span>
									</div>
								)}

								{meta.source_url && (
									<div className="flex justify-between items-center py-3">
										<span className="text-xs text-gray-500 dark:text-gray-400">
											{t('itemDetail.WEBSITE')}
										</span>
										<a
											href={meta.source_url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-xs font-medium text-theme-primary-600 hover:text-theme-primary-700 dark:text-theme-primary-400 dark:hover:text-theme-primary-300 transition-colors"
										>
											{(() => {
												try { return new URL(meta.source_url).hostname; } catch { return 'N/A'; }
											})()}
										</a>
									</div>
								)}

								<div className="flex justify-between items-center py-3">
									<span className="text-xs text-gray-500 dark:text-gray-400">
										{t('itemDetail.PUBLISHED')}
									</span>
									<span className="text-xs font-medium text-gray-900 dark:text-white">
										{meta.updated_at
											? new Date(meta.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
											: 'N/A'}
									</span>
								</div>
							</div>
						</div>

						{/* Promo Code */}
						{meta.promo_code && (
							<div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/8 overflow-hidden">
								<div className="px-5 py-4 border-b border-gray-100 dark:border-white/6">
									<h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
										{t('itemDetail.PROMO_CODE')}
									</h2>
								</div>
								<div className="px-5 py-4">
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
							</div>
						)}

						{/* Sponsor Ads */}
						{sponsors.length > 0 && (
							<SidebarSponsor sponsors={sponsors} rotationInterval={5000} />
						)}

						{/* Category */}
						{categoriesEnabled && categoryName && (
							<div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/8 overflow-hidden">
								<div className="px-5 py-4 border-b border-gray-100 dark:border-white/6 flex items-center justify-between">
									<h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
										{t('common.CATEGORY')}
									</h2>
									<span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
										1 {t('common.ITEM')}
									</span>
								</div>
								<div className="px-5 py-4">
									<a
										href={`/categories/${encodedCategory}`}
										className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/8 transition-colors capitalize"
									>
										{toTitleCase(categoryName)}
									</a>
								</div>
							</div>
						)}

						{/* Tags */}
						{tagsEnabled && tagNames.length > 0 && (
							<div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/8 overflow-hidden">
								<div className="px-5 py-4 border-b border-gray-100 dark:border-white/6 flex items-center justify-between">
									<h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
										{t('listing.TAGS')}
									</h2>
									<span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
										{tagNames.length} {tagNames.length === 1 ? t('common.ITEM') : t('common.ITEMS')}
									</span>
								</div>
								<div className="px-5 py-4 flex flex-wrap gap-1.5">
									{tagNames.map((tag, index) => (
										<a
											key={index}
											href={`/tags/${tag}`}
											className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/8 transition-colors"
										>
											#{tag}
										</a>
									))}
								</div>
							</div>
						)}

						{/* Similar items */}
						{meta.allItems && meta.allItems.length > 0 && (
							<div className="pt-2">
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

function CompactVote({ itemId }: { itemId: string }) {
	const { userVote, isLoading, handleVote } = useItemVote(itemId);
	const isVoted = userVote === 'up';

	const onClick = async (e: React.MouseEvent) => {
		e.preventDefault();
		if (isLoading) return;
		try {
			await handleVote('up');
		} finally {
			// animation handled by CSS transition
		}
	};

	return (
		<button
			onClick={onClick}
			disabled={isLoading}
			title={isVoted ? 'Remove upvote' : 'Upvote'}
			className={cn(
				'w-9 h-9 inline-flex items-center justify-center rounded-lg transition-colors duration-150',
				'bg-white dark:bg-white/3 border border-gray-200 dark:border-white/8 hover:bg-gray-50 dark:hover:bg-white/6',
				isVoted
					? 'bg-theme-primary-600 dark:bg-theme-primary-600 border-theme-primary-600 dark:border-theme-primary-500 text-white hover:bg-theme-primary-700 dark:hover:bg-theme-primary-700'
					: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
			)}
		>
			<ThumbsUp className="w-4 h-4" />
		</button>
	);
}
