'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiFolder, FiExternalLink, FiArrowRight } from 'react-icons/fi';
import { Megaphone } from 'lucide-react';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SponsorBadge } from './sponsor-badge';
import { shouldShowFallback, isProblematicUrl } from '@/lib/utils/image-domains';
import { useTranslations } from 'next-intl';
import type { SponsorWithItem } from '@/lib/types/sponsor-ad';

interface SidebarSponsorProps {
	sponsors: SponsorWithItem[];
	rotationInterval?: number; // in milliseconds, default 5000 (5 seconds)
	className?: string;
	title?: string;
}

// Helper to get category name from item
function getCategoryName(category: unknown): string {
	if (!category) return '';
	if (Array.isArray(category)) {
		const first = category[0];
		return typeof first === 'string' ? first : (first as { name?: string })?.name || '';
	}
	return typeof category === 'string' ? category : (category as { name?: string })?.name || '';
}

export function SidebarSponsor({
	sponsors,
	rotationInterval = 5000,
	className,
	title
}: SidebarSponsorProps) {
	const params = useParams();
	const locale = params?.locale as string | undefined;
	const t = useTranslations('sponsor');
	const [currentIndex, setCurrentIndex] = useState(0);

	// Filter out sponsors without valid items
	const validSponsors = sponsors.filter((s) => s.item !== null);

	// Time-based rotation
	useEffect(() => {
		if (validSponsors.length <= 1) return;

		const interval = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % validSponsors.length);
		}, rotationInterval);

		return () => clearInterval(interval);
	}, [validSponsors.length, rotationInterval]);

	// Reset index if sponsors change
	useEffect(() => {
		setCurrentIndex(0);
	}, [validSponsors.length]);

	if (validSponsors.length === 0) {
		return null;
	}

	const current = validSponsors[currentIndex];
	const item = current.item!;
	const shouldShowFallbackIcon = shouldShowFallback(item.icon_url || '');
	const detailPath = `${locale ? `/${locale}` : ''}/items/${item.slug}`;
	const categoryName = getCategoryName(item.category);

	return (
		<div
			className={cn(
				'bg-white/95 dark:bg-gray-900/95 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1',
				className
			)}
		>
			{/* Header */}
			<div className="flex items-center gap-4 mb-5">
				<div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl">
					<Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
				</div>
				<div className="flex-1">
					<h3 className="text-lg font-bold text-gray-800 dark:text-white">
						{title || t('SPONSORED')}
					</h3>
				</div>
				<SponsorBadge variant="compact" size="sm" showIcon={false} />
			</div>

			{/* Sponsor Content */}
			<Link href={detailPath} className="group block">
				<div className="p-4 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl hover:from-blue-100/80 hover:to-indigo-100/80 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-300 border border-blue-100 dark:border-blue-800/30">
					<div className="flex items-start gap-4">
						{/* Icon */}
						<div className="relative shrink-0">
							<div className="w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 bg-white dark:bg-gray-800 border border-blue-200/50 dark:border-blue-700/30 shadow-sm group-hover:shadow-md group-hover:scale-105">
								{shouldShowFallbackIcon ? (
									<FiFolder className="w-6 h-6 text-blue-600 dark:text-blue-400" />
								) : (
									<Image
										src={item.icon_url!}
										alt={`${item.name} icon`}
										className="w-6 h-6 object-contain"
										width={24}
										height={24}
										unoptimized={isProblematicUrl(item.icon_url!)}
									/>
								)}
							</div>
						</div>

						{/* Content */}
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-1">
								<span className="text-base font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
									{item.name}
								</span>
								<FiExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
							</div>

							{categoryName && (
								<span className="inline-block text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">
									{categoryName}
								</span>
							)}

							{item.description && (
								<p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
									{item.description}
								</p>
							)}

							<div className="flex items-center text-sm text-blue-600 dark:text-blue-400 font-medium group-hover:gap-2 transition-all">
								<span>{t('LEARN_MORE')}</span>
								<FiArrowRight className="w-4 h-4 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
							</div>
						</div>
					</div>
				</div>
			</Link>

			{/* Rotation indicator */}
			{validSponsors.length > 1 && (
				<div className="flex items-center justify-center gap-1.5 mt-4">
					{validSponsors.map((_, idx) => (
						<button
							key={idx}
							onClick={() => setCurrentIndex(idx)}
							className={cn(
								'w-1.5 h-1.5 rounded-full transition-all duration-300',
								idx === currentIndex
									? 'bg-blue-500 w-4'
									: 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
							)}
							aria-label={`Show sponsor ${idx + 1}`}
						/>
					))}
				</div>
			)}
		</div>
	);
}
