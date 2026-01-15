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

type ItemProps = ItemData & {
	onNavigate?: () => void;
	layout?: string;
	hideIndicatorInSimilarProducts?: boolean;
};

const TAG_BUTTON_BASE_CLASS = 'text-xs transition-all duration-300 cursor-pointer text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:scale-105 font-medium px-1 py-0.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 whitespace-nowrap';

export default function Item(props: ItemProps) {
	const params = useParams();
	const locale = params?.locale as string | undefined;
	const { data: session } = useSession();
	const [isNavigating, setIsNavigating] = useState(false);
	const { categoriesEnabled } = useCategoriesEnabled();
	const { tagsEnabled } = useTagsEnabled();

	const shouldShowFallbackIcon = shouldShowFallback(props.icon_url || '');

	const getTagName = (tag: string | Tag): string => {
		if (typeof tag === 'string') return tag;
		if (tag && typeof tag === 'object' && 'name' in tag) return tag.name;
		return '';
	};
	const isSourceUrl = props.is_source_url_active === true ? '' : (locale ? `/${locale}` : '');
	const getDetailPath = () => `${isSourceUrl}/items/${props.slug}`;

	const cardClassName = cn(
		'group relative border-0 rounded-2xl transition-all duration-300 backdrop-blur-xl overflow-hidden h-full',
		'bg-white/80 dark:bg-gray-900/80 shadow-lg hover:shadow-xl',
		'ring-1 ring-gray-200/50 dark:ring-gray-700/50 hover:ring-gray-300/70 dark:hover:ring-gray-600/70',
		'before:absolute before:inset-0 before:bg-linear-to-br before:from-white/60 before:via-transparent before:to-gray-50/40',
		'dark:before:from-gray-800/60 dark:before:via-transparent dark:before:to-gray-900/40',
		'hover:before:from-blue-50/30 hover:before:to-purple-50/20 dark:hover:before:from-blue-900/20 dark:hover:before:to-purple-900/10',
		{
			'ring-2 ring-blue-400/40 dark:ring-blue-500/40 shadow-blue-500/10 dark:shadow-blue-500/20':
				props.featured
		}
	);

	// Masonry view uses character-based truncation, other layouts use line-clamp
	const isMasonryLayout = props.layout === 'masonry';
	const displayDescription = isMasonryLayout
		? createExcerpt(props.description, FILTER_CONSTANTS.MASONRY_EXCERPT_MAX_CHARS)
		: props.description;

	const titleClassName = cn(
		'text-lg sm:text-base font-semibold leading-tight text-left text-gray-900 dark:text-white mb-1 transition-colors duration-300 group-hover:text-gray-700 dark:group-hover:text-gray-200',
		!isMasonryLayout && 'line-clamp-3 min-h-[3.75em]'
	);

	const descriptionClassName = cn(
		'text-sm leading-relaxed text-gray-600 dark:text-gray-300 transition-colors duration-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 font-medium',
		!isMasonryLayout && 'line-clamp-3'
	);

	const tagsContainerClassName = cn(
		'flex gap-0.5',
		isMasonryLayout ? 'flex-wrap' : 'flex-nowrap overflow-hidden'
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
			<div className="absolute inset-0 bg-linear-to-br from-gray-50/60 via-white/90 to-gray-100/80 dark:from-gray-900/60 dark:via-gray-800/80 dark:to-black/80 transition-all duration-700" />

			<div
				className="absolute inset-0 opacity-10 dark:opacity-20"
				style={{
					backgroundImage:
						"url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.05' fill-rule='evenodd'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' /%3E%3C/g%3E%3C/svg%3E\")"
				}}
			/>

			{/* Content container */}
			<div className="relative z-10">
				<CardHeader className="flex gap-4  pb-4">
					<div className="flex flex-col grow gap-4 min-w-0">
						<div className="flex justify-between items-start gap-3">
							{/* Left: Icon + Title + Arrow */}
							<div className="flex items-start gap-3 min-w-0">
								<div className="relative shrink-0">
									{/* Pulse/wave effect on hover */}
									<div className="absolute inset-0 w-12 h-12 rounded-2xl bg-theme-primary-500/30 dark:bg-theme-primary-400/30 opacity-0 group-hover:opacity-100 group-hover:animate-ping pointer-events-none" />
									<div className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 bg-linear-to-br from-theme-primary-10 to-indigo-100 border border-theme-primary-500 group-hover:from-theme-primary-10 group-hover:to-indigo-200 dark:from-theme-primary-10 dark:to-indigo-900/30 dark:border-theme-primary-700/30 dark:group-hover:from-theme-primary-800/40 dark:group-hover:to-indigo-800/40 shadow-xs group-hover:shadow-md group-hover:scale-105 group-hover:rotate-2">
										{shouldShowFallbackIcon ? (
											<FiFolder className="w-6 h-6 text-theme-primary dark:text-theme-primary transition-transform duration-300 group-hover:scale-110" />
										) : (
											<Image
												src={props.icon_url!}
												alt={`${props.name} icon`}
												className="w-6 h-6 object-contain transition-transform duration-300 group-hover:scale-110"
												width={24}
												height={24}
												unoptimized={isProblematicUrl(props.icon_url!)}
											/>
										)}
									</div>
								</div>

								<div className="min-w-0">
									<div className={titleClassName}>
										{props.name}
									</div>
									<div className="w-0 h-0.5 bg-gray-300 dark:bg-gray-600 group-hover:w-12 transition-all duration-500 ease-out" />
								</div>

								{/* Arrow indicator - right after title */}
								{props.layout === 'classic' && (
									<div
										className="shrink-0 h-6 w-6 rounded-full bg-theme-primary-500/10 dark:bg-theme-primary-400/10 flex items-center justify-center backdrop-blur-xs border border-theme-primary-10 dark:border-theme-primary opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105"
										aria-hidden="true"
									>
										<FiArrowUpRight className="w-3 h-3 text-theme-primary-600 dark:text-theme-primary-400" />
									</div>
								)}
							</div>

							{/* Right: FavoriteButton + FeaturedBadge */}
							<div className="flex items-center gap-2">
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

								{props.featured && (
									<FeaturedBadge
										variant="hero"
										size="sm"
										className="px-3 py-1 text-xs font-normal bg-linear-to-r from-amber-100 to-yellow-100 text-amber-800 border border-amber-200/50 dark:from-amber-900/30 dark:to-yellow-900/30 dark:text-amber-300 dark:border-amber-700/30 transition-all duration-300 hover:scale-105 shadow-xs hover:shadow-md rounded-full"
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
						<p className={descriptionClassName}>
							{displayDescription}
						</p>

						{/* Enhanced Hashtags - Only show if tags are enabled, tags exist, and have valid names */}
						{tagsEnabled && props.tags && Array.isArray(props.tags) && props.tags.length > 0 && (
						<div className={tagsContainerClassName}>
							{props.tags.slice(0, isMasonryLayout ? 4 : 3).map((tag, index) => {
								const tagName = getTagName(tag);
								const tagId = typeof tag === 'string' ? tag : tag.id;
								if (!tagName) return null;

								return (
									<TagFilterButton
										key={tagId || `tag-${index}`}
										tag={tag}
										index={index}
									/>
								);
							})}
							{!isMasonryLayout && props.tags.length > 3 && (
								<span className="text-xs text-gray-500 dark:text-gray-400 font-medium px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 whitespace-nowrap shrink-0">
									+{props.tags.length - 3}
								</span>
							)}
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
				'bg-theme-primary-10 px-3 py-2 text-xs font-semibold rounded-full bg-linear-to-r from-theme-primary-100 to-theme-primary-100 text-theme-primary  dark:from-theme-primary-900/30 dark:to-theme-primary-900/30 dark:text-theme-primary border-theme-primary-10 transition-all duration-300 hover:scale-105 hover:shadow-md capitalize shadow-xs border dark:border-gray-600/30 focus:outline-hidden ' +
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
				isActive && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
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
