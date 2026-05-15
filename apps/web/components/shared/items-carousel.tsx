'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ItemData } from '@/lib/content';
import Item from '../item';

interface ItemsCarouselProps {
	items: ItemData[];
	max?: number;
	itemLayout?: 'grid' | 'classic' | 'sleek' | 'compact';
	className?: string;
	cardWidth?: number;
	gapPx?: number;
}

/**
 * Horizontal items carousel with prev/next buttons, dot indicators and
 * gradient edge overlays. Extracted from the favorites page so it can be
 * reused on item detail (and elsewhere) without duplicating the
 * ResizeObserver + scroll math.
 */
export function ItemsCarousel({
	items,
	max = 12,
	itemLayout = 'grid',
	className,
	cardWidth = 320,
	gapPx = 12
}: ItemsCarouselProps) {
	const t = useTranslations('common');
	const carouselItemWidth = cardWidth + gapPx;

	const carouselItems = useMemo(() => items.slice(0, max), [items, max]);
	const carouselItemsTotal = carouselItems.length;

	const carouselRef = useRef<HTMLDivElement>(null);
	const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
	const [containerWidth, setContainerWidth] = useState(0);
	const [position, setPosition] = useState(0);

	const itemsToShow =
		containerWidth > 0 ? Math.max(1, Math.floor(containerWidth / carouselItemWidth)) : 4;

	useEffect(() => {
		if (!containerEl) return;
		const ro = new ResizeObserver(([entry]) => {
			setContainerWidth(entry.contentRect.width);
		});
		ro.observe(containerEl);
		setContainerWidth(containerEl.getBoundingClientRect().width);
		return () => ro.disconnect();
	}, [containerEl]);

	const maxScroll = Math.max(0, (carouselItemsTotal - itemsToShow) * carouselItemWidth);

	// Clamp position when viewport widens or item count shrinks
	useEffect(() => {
		setPosition((prev) => Math.min(prev, maxScroll));
	}, [maxScroll]);

	const handlePrev = useCallback(() => {
		setPosition((prev) => Math.max(prev - carouselItemWidth, 0));
	}, [carouselItemWidth]);

	const handleNext = useCallback(() => {
		setPosition((prev) => Math.min(prev + carouselItemWidth, maxScroll));
	}, [carouselItemWidth, maxScroll]);

	const canPrev = position > 0;
	const canNext = position < maxScroll;
	const isOverflowing = carouselItemsTotal > itemsToShow;

	if (carouselItemsTotal === 0) return null;

	return (
		<div className={`relative ${className ?? ''}`}>
			{isOverflowing && (
				<button
					onClick={handlePrev}
					className={`absolute -left-5 top-1/2 -translate-y-1/2 cursor-pointer z-10 p-2 rounded-full bg-white dark:bg-white/10 shadow-lg hover:shadow-xl text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/20 transition-all duration-200 hover:-translate-x-1 pointer-events-auto ${
						!canPrev ? 'hidden' : ''
					}`}
					aria-label={t('PREVIOUS', { defaultValue: 'Previous' })}
				>
					<ChevronLeft className="w-4 h-4" />
				</button>
			)}

			<div ref={setContainerEl} className="overflow-hidden rounded-lg py-3 pl-8">
				<div
					ref={carouselRef}
					className="flex gap-3 transition-transform duration-300 ease-out"
					style={{ transform: `translateX(-${position}px)` }}
				>
					{carouselItems.map((item) => (
						<div key={item.slug} className="flex-shrink-0 w-80">
							<Item {...item} layout={itemLayout} />
						</div>
					))}
				</div>
			</div>

			{isOverflowing && (
				<button
					onClick={handleNext}
					className={`absolute -right-5 top-1/2 -translate-y-1/2 cursor-pointer z-10 p-2 rounded-full bg-white dark:bg-white/10 shadow-lg hover:shadow-xl text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/20 transition-all duration-200 hover:translate-x-1 pointer-events-auto ${
						!canNext ? 'hidden' : ''
					}`}
					aria-label={t('NEXT_STEP', { defaultValue: 'Next' })}
				>
					<ChevronRight className="w-4 h-4" />
				</button>
			)}

			{position > 0 && isOverflowing && (
				<div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white dark:from-[#0a0a0a] to-transparent pointer-events-none" />
			)}

			{isOverflowing && (
				<div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-[#0a0a0a] to-transparent pointer-events-none" />
			)}

			{isOverflowing && (
				<div className="flex justify-center gap-2 mt-8">
					{Array.from({ length: Math.ceil((carouselItemsTotal - itemsToShow) / 1) + 1 }).map(
						(_, index) => {
							const indicatorPosition = index * carouselItemWidth;
							const isActive = Math.round(position / carouselItemWidth) === index;
							return (
								<button
									key={index}
									onClick={() => setPosition(indicatorPosition)}
									className={`h-2 rounded-full transition-all duration-300 ${
										isActive
											? 'w-6 bg-theme-primary-600 dark:bg-white'
											: 'w-2 bg-gray-300 dark:bg-white/20 hover:bg-gray-400 dark:hover:bg-white/30'
									}`}
									aria-label={`Go to carousel page ${index + 1}`}
									aria-current={isActive ? 'page' : undefined}
								/>
							);
						}
					)}
				</div>
			)}
		</div>
	);
}
