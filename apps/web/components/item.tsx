'use client';

import { ItemData, Tag, Category } from '@/lib/content';
import Link from 'next/link';
import { Card, CardBody, cn, Spinner } from '@heroui/react';
import { FiFolder } from 'react-icons/fi';
import { useFilters } from '@/components/filters/context/filter-context';
import { useParams } from 'next/navigation';
import { PromoCodeComponent } from './promo-code';
import { FavoriteButton } from './favorite-button';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { shouldShowFallback, isProblematicUrl } from '@/lib/utils/image-domains';
import { FeaturedBadge } from './featured-items';
import { useState, memo } from 'react';
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

const Item = memo(function Item(props: ItemProps) {
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

	const isMasonryLayout = props.layout === 'masonry';
	const isGridLayout = props.layout === 'grid';
	const isGridOrClassicLayout = isGridLayout || props.layout === 'classic';

	const displayDescription = isMasonryLayout
		? createExcerpt(props.description, FILTER_CONSTANTS.MASONRY_EXCERPT_MAX_CHARS)
		: props.description;

	const cardClassName = cn(
		'group relative rounded-sm overflow-hidden border-0 transition-all duration-200',
		'bg-white dark:bg-white/3',
		'shadow-sm hover:shadow-md dark:shadow-none',
		'ring-1 ring-black/[0.06] dark:ring-white/[0.12] hover:ring-black/[0.10] dark:hover:ring-white/30',
		isGridLayout ? 'h-[300px] flex flex-col' : 'h-full flex flex-col'
	);

	const descriptionClassName = cn(
		'text-[13px] leading-relaxed text-gray-500 dark:text-gray-400',
		!isMasonryLayout && 'line-clamp-3',
		isGridOrClassicLayout && 'min-h-[4.5em]'
	);

	return (
		<Link
			href={getDetailPath()}
			onClick={() => {
				setIsNavigating(true);
				props.onNavigate?.();
			}}
			className="block h-full"
		>
			<Card className={cardClassName}>
				<CardBody className="flex flex-col gap-4 p-4 h-full">
					{/* Top row: icon + name */}
				<div className="flex items-start gap-3 min-w-0 overflow-hidden">
						{/* Icon */}
						<div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-white/5">
							{shouldShowFallbackIcon ? (
								<FiFolder className="w-5 h-5 text-gray-400 dark:text-gray-500" />
							) : (
								<Image
									src={props.icon_url!}
									alt={`${props.name} icon`}
									className="w-6 h-6 object-contain"
									width={24}
									height={24}
									unoptimized={isProblematicUrl(props.icon_url!)}
								/>
							)}
						</div>

						{/* Name */}
						<p className="min-w-0 flex-1 text-sm font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2">
							{props.name}
						</p>
					</div>

					{/* Categories */}
					{categoriesEnabled && (
						<div className="flex items-center gap-1.5 flex-wrap">
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

					{/* Description */}
					<p className={descriptionClassName}>{displayDescription}</p>

					{/* Tags */}
					{tagsEnabled && props.tags && Array.isArray(props.tags) && props.tags.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{props.tags.slice(0, 4).map((tag, index) => {
								const tagName = getTagName(tag);
								const tagId = typeof tag === 'string' ? tag : tag.id;
								if (!tagName) return null;
								return <TagFilterButton key={tagId || `tag-${index}`} tag={tag} />;
							})}
						</div>
					)}

					{/* Promo Code */}
					{props.promo_code && (
						<div className="mt-auto pt-3">
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

					{/* Bottom row: FavoriteButton, DistanceBadge, FeaturedBadge */}
					{(session?.user?.id || distance !== undefined || props.featured) && (
						<div className="mt-auto flex items-center gap-2 pt-1">
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
									className="transition-opacity duration-200"
									hideIndicatorInSimilarProducts={props.hideIndicatorInSimilarProducts}
								/>
							)}
							{distance !== undefined && <DistanceBadge distance={distance} size="sm" />}
							{props.featured && (
								<FeaturedBadge
									variant="hero"
									size="sm"
									collapsible={true}
									showText={false}
									className="rounded-full text-amber-500 dark:text-amber-400"
								/>
							)}
						</div>
					)}
				</CardBody>

				{/* Loading overlay */}
				{isNavigating && (
					<div className="absolute inset-0 bg-white/80 dark:bg-black/60 backdrop-blur-xs rounded-xl flex items-center justify-center z-50">
						<Spinner size="lg" color="primary" />
					</div>
				)}
			</Card>
		</Link>
	);
});

export default Item;

type CategoryProp = string | Category;
type TagProp = string | Tag;

const CategoryFilterButton = memo(function CategoryFilterButton({ category }: { category: CategoryProp }) {
	const { selectedCategories, addSelectedCategory } = useFilters();
	const categoryId = typeof category === 'string' ? category : category?.id;
	const categoryName = typeof category === 'string' ? category : category?.name || categoryId;
	const isActive = selectedCategories.includes(categoryId);
	return (
		<button
			type="button"
			data-category-filter
			className={cn(
				'text-xs font-medium px-2.5 py-1 rounded-full capitalize transition-colors duration-150',
				'bg-gray-100 dark:bg-white/6 text-gray-600 dark:text-gray-400',
			'hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-white/8 dark:hover:text-white',
			isActive &&
				'bg-gray-200 text-gray-900 dark:bg-white/8 dark:text-white'
			)}
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
});

const TagFilterButton = memo(function TagFilterButton({ tag }: { tag: TagProp }) {
	const { selectedTags, addSelectedTag } = useFilters();
	const tagId = typeof tag === 'string' ? tag : (tag.id ?? '');
	const tagName = typeof tag === 'string' ? tag : (tag.name ?? tagId);
	const isActive = tagId ? selectedTags.includes(tagId) : false;

	return (
		<button
			type="button"
			data-tag-filter
			className={cn(
			'text-xs font-medium px-1 py-0.5 rounded transition-colors duration-150',
			'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white/70',
			isActive && 'text-gray-700 dark:text-white/70'
			)}
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
});
