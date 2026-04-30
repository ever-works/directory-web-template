'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ItemData, Category } from '@/lib/content';

/**
 * Pull a display-friendly category name out of `ItemData.category`,
 * which may be a string, a `Category` object, or an array of either.
 */
function getCategoryName(category: ItemData['category']): string | undefined {
	if (!category) return undefined;
	if (typeof category === 'string') return category;
	if (Array.isArray(category)) {
		const first = category[0];
		if (!first) return undefined;
		return typeof first === 'string' ? first : (first as Category).name;
	}
	return (category as Category).name;
}

interface MapSidebarProps {
	/** Items to render — already filtered to those with coordinates. */
	items: ItemData[];
	/** Currently selected item slug, if any. */
	selectedSlug?: string | null;
	/**
	 * Called when the user clicks a card. The parent decides whether to
	 * pan the map and open the marker popup.
	 */
	onSelect?: (slug: string) => void;
	className?: string;
}

/**
 * Side panel of listing cards rendered next to the map.
 *
 * Each card is a focusable link to the item-detail page. The parent
 * component owns the `selectedSlug`/`onSelect` contract so that
 * marker clicks can highlight the matching card and vice-versa.
 */
export function MapSidebar({ items, selectedSlug, onSelect, className }: MapSidebarProps) {
	const locale = useLocale();
	const t = useTranslations('listing');
	const containerRef = useRef<HTMLUListElement>(null);

	// Scroll the active card into view whenever the selection changes.
	useEffect(() => {
		if (!selectedSlug || !containerRef.current) return;
		const node = containerRef.current.querySelector<HTMLElement>(
			`[data-slug="${CSS.escape(selectedSlug)}"]`
		);
		node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}, [selectedSlug]);

	if (items.length === 0) {
		return null;
	}

	return (
		<aside
			aria-label={t('MAP_SIDEBAR_LABEL')}
			data-testid="map-sidebar"
			className={cn(
				'h-full overflow-y-auto bg-white dark:bg-[#0a0a0a]',
				'border-r border-gray-200/50 dark:border-white/6',
				className
			)}
		>
			<ul ref={containerRef} className="divide-y divide-gray-100 dark:divide-white/6">
				{items.map((item) => {
					const isActive = item.slug === selectedSlug;
					const category = getCategoryName(item.category);
					return (
						<li
							key={item.slug}
							data-slug={item.slug}
							data-testid="map-sidebar-card"
							{...(isActive ? { 'aria-current': 'true' } : {})}
							className={cn(
								'transition-colors',
								isActive
									? 'bg-theme-primary-50/60 dark:bg-theme-primary-500/10 border-l-4 border-l-theme-primary-500'
									: 'border-l-4 border-l-transparent hover:bg-gray-50 dark:hover:bg-white/4'
							)}
						>
							<button
								type="button"
								onClick={() => onSelect?.(item.slug)}
								className="w-full text-left p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
							>
								<div className="flex items-start gap-3">
									{item.icon_url ? (
										<Image
											src={item.icon_url}
											alt=""
											width={40}
											height={40}
											className="w-10 h-10 rounded-md object-cover flex-shrink-0"
										/>
									) : (
										<div className="w-10 h-10 rounded-md bg-gray-100 dark:bg-white/6 flex items-center justify-center flex-shrink-0">
											<MapPin className="w-5 h-5 text-gray-400" />
										</div>
									)}
									<div className="min-w-0 flex-1">
										<h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
											{item.name}
										</h3>
										{category && (
											<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
												{category}
											</p>
										)}
										{item.description && (
											<p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
												{item.description}
											</p>
										)}
										<Link
											href={`/${locale}/items/${item.slug}`}
											className="inline-block mt-2 text-xs font-medium text-theme-primary-600 dark:text-theme-primary-400 hover:underline"
											onClick={(event) => event.stopPropagation()}
										>
											{t('MAP_VIEW_DETAILS')}
										</Link>
									</div>
								</div>
							</button>
						</li>
					);
				})}
			</ul>
		</aside>
	);
}

export default MapSidebar;
