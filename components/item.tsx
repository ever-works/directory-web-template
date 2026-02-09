'use client';

import { ItemData, Tag, Category } from '@/lib/content';
import Link from 'next/link';
import { Card, CardHeader, CardBody, cn, Spinner } from '@heroui/react';
import { FiArrowUpRight, FiFolder } from 'react-icons/fi';
import { useFilters } from '@/components/filters/context/filter-context';
import { useParams } from 'next/navigation';
import { PromoCodeComponent } from './promo-code';
import { FavoriteButton } from './favorite-button';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { shouldShowFallback, isProblematicUrl } from '@/lib/utils/image-domains';
import { FeaturedBadge } from './featured-items';
import { useState } from 'react';
import { createExcerpt } from '@/components/filters/utils/text-utils';
import { FILTER_CONSTANTS } from '@/components/filters/constants';
import { useCategoriesEnabled } from '@/hooks/use-categories-enabled';
import { useTagsEnabled } from '@/hooks/use-tags-enabled';
import { useItemDistance } from '@/components/filters/context/location-distance-context';
import { DistanceBadge } from '@/components/ui/distance-badge';

type ItemProps = ItemData & {
	onNavigate?: () => void;
	layout?: string;
	hideIndicatorInSimilarProducts?: boolean;
};

const TAG_BUTTON_BASE_CLASS =
	'text-xs transition-all duration-300 cursor-pointer text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 font-medium px-1 py-[2px]! rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20';

export default function Item(props: ItemProps) {
	const params = useParams();
	const locale = params?.locale as string | undefined;
	const { data: session } = useSession();
	const [isNavigating, setIsNavigating] = useState(false);
	const { categoriesEnabled } = useCategoriesEnabled();
	const { tagsEnabled } = useTagsEnabled();
	const distance = useItemDistance(props.slug);

	const shouldShowFallbackIcon = shouldShowFallback(props.icon_url || '');

	const getTagName = (tag: string | Tag): string => {
		if (typeof tag === 'string') return tag;
		if (tag && typeof tag === 'object' && 'name' in tag) return tag.name;
		return '';
	};
	const isSourceUrl = props.is_source_url_active === true ? '' : locale ? `/${locale}` : '';
	const getDetailPath = () => `${isSourceUrl}/items/${props.slug}`;

	// Layout checks
	const isMasonryLayout = props.layout === 'masonry';
	const isGridLayout = props.layout === 'grid';
	const isGridOrClassicLayout = isGridLayout || props.layout === 'classic';

	const cardClassName = cn(
		'group relative border-0 rounded-2xl transition-all duration-300 backdrop-blur-xl overflow-hidden',
		'bg-white/80 dark:bg-gray-900/80',
		'ring-1 ring-gray-200/50 dark:ring-gray-700/50 hover:ring-gray-300/70 dark:hover:ring-gray-600/70',
		'before:absolute before:inset-0 before:bg-linear-to-br before:from-white/60 before:via-transparent before:to-gray-50/40',
		'dark:before:from-gray-800/60 dark:before:via-transparent dark:before:to-gray-900/40',
		'hover:before:from-blue-50/30 hover:before:to-purple-50/20 dark:hover:before:from-blue-900/20 dark:hover:before:to-purple-900/10',
		// Grid view: fixed height for consistent card sizes
		isGridLayout ? 'h-[320px]' : 'h-full',
		{
			'border-1 border-blue-400/40 dark:border-blue-500/40 shadow-blue-500/10 dark:shadow-blue-500/20': props.featured
		}
	);

	// Masonry view uses character-based truncation, other layouts use line-clamp
	const displayDescription = isMasonryLayout
		? createExcerpt(props.description, FILTER_CONSTANTS.MASONRY_EXCERPT_MAX_CHARS)
		: props.description;

	// Title styling: for grid/classic layouts, reserve space for 3 lines and truncate if longer
	const titleClassName = cn(
		'text-base min-w-2/5 mt-2 mb-1 sm:text-base font-semibold leading-tight text-left text-gray-900 dark:text-white transition-colors duration-300 group-hover:text-gray-700 dark:group-hover:text-gray-200',
	);

	const descriptionClassName = cn(
		'text-sm leading-relaxed text-gray-600 dark:text-gray-300 transition-colors duration-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 font-medium',
		!isMasonryLayout && 'line-clamp-3',
		isGridOrClassicLayout && 'min-h-[4.5em]' // Reserve space for 3 lines of description
	);

	// Tags container styling: for grid/classic layouts, reserve consistent space
	const tagsContainerClassName = cn(
		'flex flex-wrap gap-0.5',
		isGridOrClassicLayout // Reserve space for 1 line of tags
	);

	return (
		<Link
			href={getDetailPath()}
			onClick={() => {
				setIsNavigating(true);
				props.onNavigate?.();
			}}
			className="block"
		>
			<Card className={cardClassName}>
					{/* Decorative short top border accent with fading edges */}
					<div
						className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 w-1/2 h-px z-20 opacity-70"
						style={{
							background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)',
							borderRadius: '9999px'
						}}
					/>

					{/* Decorative blurred circles background */}
					<div className="pointer-events-none absolute inset-0 z-0">
						<div className="absolute w-40 h-40 bg-[#6209bb]/20 opacity-50 rounded-full blur-3xl left-2 top-0"></div>
						<div className="absolute w-32 h-32 bg-blue-200/20 opacity-50 rounded-full blur-3xl right-1 top-20"></div>
						<div className="absolute w-28 h-28 bg-[#6209bb]/20 opacity-50 rounded-full blur-2xl left-1/2 -translate-x-1/2 bottom-4"></div>
					</div>

					{/* Hover image at top (decorative) */}
					{/* <div className="pointer-events-none absolute left-0 right-0 top-0 z-20">
						<Image src="/bg-cards.png" alt="Decorative pattern" className="w-full filter brightness-0 dark:brightness-200 -rotate-180" width={800} height={400} />
					</div> */}

					{/* Blurred background element */}
					<div
						className="absolute inset-0 bg-linear-to-br from-theme-primary/0 via-theme-primary/0 to-theme-primary/0 
						group-hover:from-theme-primary/5 group-hover:via-theme-primary/3 group-hover:to-theme-primary/5 
						transition-all duration-500 rounded-2xl blur-xl"
					/>

					{/* Color overlay */}
					<div
						className="absolute inset-0 bg-theme-primary/0 group-hover:bg-theme-primary/3 
						transition-all duration-500 rounded-2xl"
					/>

					{/* Border glow effect */}
					<div
						className="absolute inset-0 border-2 border-transparent rounded-2xl 
						group-hover:border-theme-primary/15 transition-all duration-500"
					/>

					{/* Subtle particles/blur effect */}
					<div
						className="absolute top-0 right-0 w-32 h-32 -translate-y-1/2 translate-x-1/2 
						bg-theme-primary/5 rounded-full blur-2xl group-hover:blur-2xl 
						transition-all duration-500"
					></div>

					{/* <div className="absolute inset-0 bg-linear-to-br from-gray-50/60 via-white/90 to-gray-100/80 dark:from-gray-900/60 dark:via-gray-800/80 dark:to-black/80 transition-all duration-700" /> */}

				<div
					className="absolute inset-0 opacity-10 dark:opacity-20"
					// style={{
					// 	backgroundImage:
					// 		"url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.05' fill-rule='evenodd'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' /%3E%3C/g%3E%3C/svg%3E\")"
					// }}
				/>

				{/* Content container */}
				<div className="relative z-10">
					<CardHeader className="relative flex gap-3  pb-4">
						<div className="flex flex-col grow gap-4 min-w-0">
							<div className="flex justify-between items-start gap-2">
								{/* Left: Icon + Title + Arrow */}
								<div className="flex items-start gap-2 min-w-0 pr-16">
									<div className="relative shrink-0">
										{/* Pulse/wave effect on hover */}
										<div className="absolute inset-0 w-12 h-12 rounded-2xl bg-theme-primary-500/30 dark:bg-theme-primary-400/30 opacity-0 group-hover:opacity-100 group-hover:animate-ping pointer-events-none" />
										<div className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 bg-linear-to-br from-theme-primary-10 to-indigo-100 border border-theme-primary-500 group-hover:from-theme-primary-10 group-hover:to-indigo-200 dark:from-theme-primary-10 dark:to-indigo-900/30 dark:border-theme-primary-700/30 dark:group-hover:from-theme-primary-800/40 dark:group-hover:to-indigo-800/40 shadow-xs group-hover:shadow-md group-hover:rotate-2">
												{shouldShowFallbackIcon ? (
												<FiFolder className="w-6 h-6 text-theme-primary dark:text-theme-primary transition-transform duration-300" />
											) : (
												<Image
													src={props.icon_url!}
													alt={`${props.name} icon`}
													className="w-6 h-6 object-contain transition-transform duration-300"
													width={24}
													height={24}
													unoptimized={isProblematicUrl(props.icon_url!)}
												/>
											)}
										</div>
									</div>

									<div className="min-w-0">
										<div className={titleClassName}>{props.name}</div>
									<div className="w-12 h-0.5 bg-gray-300 dark1:bg-gray-600 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-out" />
									</div>
									{/* Arrow indicator - right after title */}
									{props.layout === 'classic' && (
										<div
											className="shrink-0 h-6 w-6 rounded-full bg-theme-primary-500/10 dark:bg-theme-primary-400/10 flex items-center justify-center backdrop-blur-xs border border-theme-primary-10 dark:border-theme-primary opacity-0 group-hover:opacity-100 transition-all duration-300"
											aria-hidden="true"
										>
											<FiArrowUpRight className="w-3 h-3 text-theme-primary-600 dark:text-theme-primary-400" />
										</div>
									)}
								</div>

								{/* Right: FavoriteButton + FeaturedBadge (absolute at top-right) */}
								<div className="absolute top-2 right-1 z-20 flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-none group-hover:backdrop-blur-sm transition-all duration-200">
									{session?.user?.id && (
										<FavoriteButton
											itemSlug={props.slug}
											itemName={props.name}
											itemIconUrl={props.icon_url}
											itemCategory={
												Array.isArray(props.category)
													? typeof props.category[0] === 'string'
														? props.category[0]
														: props.category[0]?.name
													: typeof props.category === 'string'
														? props.category
														: props.category?.name
											}
											variant="star"
											size="sm"
											className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 !top-0 !right-0"
											hideIndicatorInSimilarProducts={props.hideIndicatorInSimilarProducts}
										/>
									)}

									{distance !== undefined && (
										<DistanceBadge distance={distance} size="sm" />
									)}

									{props.featured && (
										<FeaturedBadge
											variant="hero"
											size="sm"
											collapsible={true}
											showText={false}
											className="bg-linear-to-r from-amber-100 to-yellow-100 text-amber-800 border border-amber-200/50 dark:from-amber-900/30 dark:to-yellow-900/30 dark:text-amber-300 dark:border-amber-700/30 transition-all duration-1000 shadow-xs hover:shadow-md rounded-full"
										/>
									)}
								</div>
							</div>

							{categoriesEnabled && (
								<div className="flex items-center gap-2 flex-wrap">
									{Array.isArray(props.category) ? (
										props.category.map(
											(cat, idx) =>
												cat && (
													<CategoryFilterButton
														key={typeof cat === 'string' ? cat : cat.id || idx}
														category={cat}
													/>
												)
										)
									) : (
										<CategoryFilterButton category={props.category} />
									)}
								</div>
							)}
						</div>
					</CardHeader>

					<CardBody className="px-6 py-4 pt-0">
						<div className="space-y-5">
							{/* Enhanced Description */}
							<p className={descriptionClassName}>{displayDescription}</p>

							{/* Enhanced Hashtags - Only show if tags are enabled, tags exist, and have valid names */}
							{tagsEnabled && props.tags && Array.isArray(props.tags) && props.tags.length > 0 && (
								<div className={tagsContainerClassName}>
									{props.tags.slice(0, 4).map((tag, index) => {
										const tagName = getTagName(tag);
										const tagId = typeof tag === 'string' ? tag : tag.id;
										if (!tagName) return null;

										return (
											<TagFilterButton key={tagId || `tag-${index}`} tag={tag} index={index} />
										);
									})}
								</div>
							)}
						</div>

						{/* Promo Code Section */}
						{props.promo_code && (
							<div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
								<PromoCodeComponent
									promoCode={props.promo_code}
									variant="compact"
									showDescription={false}
									showTerms={false}
									className="w-full"
									onCodeCopied={(code) => {
										if (typeof window !== 'undefined' && (window as any).gtag) {
											(window as any).gtag('event', 'promo_code_copied', {
												event_category: 'engagement',
												event_label: code,
												item_name: props.name
											});
										}
									}}
								/>
							</div>
						)}
					</CardBody>
				</div>

				{/* Subtle glow effect */}
				<div className="absolute inset-0 rounded-2xl bg-linear-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

				{/* Loading overlay */}
				{isNavigating && (
					<div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xs rounded-2xl flex items-center justify-center z-50 transition-opacity duration-300">
						<Spinner size="lg" color="primary" />
					</div>
				)}
			</Card>
		</Link>
	);
}

type CategoryProp = string | Category;
type TagProp = string | Tag;

function CategoryFilterButton({ category }: { category: CategoryProp }) {
	const { selectedCategories, addSelectedCategory } = useFilters();
	const categoryId = typeof category === 'string' ? category : category?.id;
	const categoryName = typeof category === 'string' ? category : category?.name || categoryId;
	const isActive = selectedCategories.includes(categoryId);
	return (
		<button
			type="button"
			data-category-filter
			className={
				'bg-theme-primary-10 px-3 py-2 text-xs font-semibold rounded-full bg-linear-to-r from-theme-primary-100 to-theme-primary-100 text-theme-primary  dark:from-theme-primary-900/30 dark:to-theme-primary-900/30 dark:text-theme-primary border-theme-primary-10 transition-all duration-300 hover:shadow-md capitalize shadow-xs border dark:border-gray-600/30 focus:outline-hidden ' +
				(isActive ? 'ring-2 ring-theme-primary-500' : '')
			}
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				if (!isActive) {
					addSelectedCategory(categoryId);
				}
			}}
		>
			{categoryName}
		</button>
	);
}

function TagFilterButton({ tag, index }: { tag: TagProp; index: number }) {
	const { selectedTags, addSelectedTag } = useFilters();
	const tagId = typeof tag === 'string' ? tag : (tag.id ?? '');
	const tagName = typeof tag === 'string' ? tag : (tag.name ?? tagId);
	const isActive = tagId ? selectedTags.includes(tagId) : false;

	return (
		<button
			type="button"
			data-tag-filter
			className={cn(
				TAG_BUTTON_BASE_CLASS,
				isActive && 'border border-blue-500/50 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
			)}
			style={{ animationDelay: `${index * 0.05}s` }}
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				if (!tagId || isActive) return;
				addSelectedTag(tagId);
			}}
			aria-label={`Filter by tag ${tagName}`}
		>
			#{tagName}
		</button>
	);
}
