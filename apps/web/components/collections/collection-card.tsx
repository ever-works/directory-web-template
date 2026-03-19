'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Spinner } from '@heroui/react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Collection } from '@/types/collection';
import Image from 'next/image';

interface CollectionCardProps {
	collection: Collection;
}

export function CollectionCard({ collection }: CollectionCardProps) {
	const t = useTranslations('common');
	const [isNavigating, setIsNavigating] = useState(false);
	const pathname = usePathname();

	// Reset spinner when route changes (e.g., back navigation)
	useEffect(() => {
		setIsNavigating(false);
	}, [pathname]);

	return (
		<Link
			href={`/collections/${collection.slug}`}
			onClick={(e) => {
				// Only show spinner for regular left-click navigation (not middle-click, Cmd/Ctrl+click)
				if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
					setIsNavigating(true);
				}
			}}
			className="group relative block p-6 bg-white dark:bg-white/3
			rounded-md border border-gray-200/80 dark:border-white/6
			hover:border-gray-300 dark:hover:border-white/[0.12]
			transition-all duration-200
			overflow-hidden cursor-pointer"
		>
			{/* Decorative short top border accent with fading edges */}
			<div
				className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 w-1/2 h-px z-20 opacity-70"
				style={{
					background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)',
					borderRadius: '9999px',
				}}
			/>

			{/* Hover image at top, reversed horizontally, only visible on hover, now with higher opacity */}
			<div className="pointer-events-none absolute left-0 right-0 top-0 z-20">
				<Image src="/bg-cards.png" alt="Decorative pattern" className="w-full filter brightness-0 dark:brightness-200 -rotate-180" width={800} height={400}/>
			</div>

			{/* Item count badge - top left with primary blue */}
			<div className="absolute top-3 left-3 z-20">
				<div
					className="inline-flex items-center px-2 py-1 rounded-full 
        bg-theme-primary/10 dark:bg-theme-primary/20
        border border-theme-primary/20 dark:border-theme-primary/30
        text-xs font-medium text-theme-primary dark:text-theme-primary-400
        backdrop-blur-sm
        group-hover:bg-theme-primary/15 dark:group-hover:bg-theme-primary/25
        group-hover:border-theme-primary/30 dark:group-hover:border-theme-primary/40
        transition-all duration-300"
				>
					<span>
						{t('COLLECTION_ITEMS', { count: collection.items?.length ?? collection.item_count ?? 0 })}
					</span>
				</div>
			</div>

			{/* Content container */}
			<div className="relative z-10 pt-4">
				{/* Icon with reduced glow */}
				<div className="relative mb-4 text-4xl transition-all duration-500">
					<div
						className="absolute -inset-3 bg-theme-primary/10 rounded-full blur-md 
          opacity-0 group-hover:opacity-70 transition-opacity duration-500"
					/>
					<span
						className="relative z-10 group-hover:text-theme-primary 
          transition-colors duration-300"
					>
						{collection.icon_url || '📦'}
					</span>
				</div>

				{/* Title */}
				<h3
					className="relative text-lg font-bold mb-3 text-gray-900 dark:text-white 
        group-hover:text-theme-primary"
				>
					{collection.name}
				</h3>

				{/* Description */}
				<p
					className="relative text-xs text-gray-600 dark:text-gray-500 mb-4 line-clamp-3 
        group-hover:text-gray-700 dark:group-hover:text-gray-300"
				>
					{collection.description}
				</p>

				{/* Arrow indicator - bottom right */}
				<div className="relative flex items-center justify-end text-sm text-theme-primary font-medium">
					<span className="text-xs opacity-80 group-hover:opacity-100">
						{t('VIEW_COLLECTION')}
					</span>
					<svg
						className="w-4 h-4 ml-2 transform group-hover:translate-x-1"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
					</svg>
				</div>
			</div>

			{/* Subtle particles/blur effect - reduced opacity */}
			<div
				className="absolute top-0 right-0 w-32 h-32 -translate-y-1/2 translate-x-1/2 
      bg-theme-primary/5 rounded-full blur-2xl group-hover:blur-2xl 
      transition-all duration-500"
			></div>

			{isNavigating && (
				<div className="absolute inset-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xs rounded-xl flex items-center justify-center z-50 transition-opacity duration-300">
					<Spinner size="lg" color="primary" />
				</div>
			)}
		</Link>
	);
}
