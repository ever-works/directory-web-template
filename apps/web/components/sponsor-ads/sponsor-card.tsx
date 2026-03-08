'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardBody, cn } from '@heroui/react';
import { FiFolder, FiExternalLink } from 'react-icons/fi';
import { useParams } from 'next/navigation';
import { SponsorBadge } from './sponsor-badge';
import { shouldShowFallback, isProblematicUrl } from '@/lib/utils/image-domains';
import type { SponsorWithItem } from '@/lib/types/sponsor-ad';

interface SponsorCardProps {
	sponsors: SponsorWithItem[];
	rotationInterval?: number; // in milliseconds, default 5000 (5 seconds)
	className?: string;
	variant?: 'default' | 'compact';
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

// Helper to get tag names from item
function getTagNames(tags: unknown): string[] {
	if (!tags || !Array.isArray(tags)) return [];
	return tags.map((tag) => (typeof tag === 'string' ? tag : (tag as { name?: string })?.name || '')).filter(Boolean);
}

export function SponsorCard({
	sponsors,
	rotationInterval = 5000,
	className,
	variant = 'default'
}: SponsorCardProps) {
	const params = useParams();
	const locale = params?.locale as string | undefined;
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
	const tagNames = getTagNames(item.tags);

	const cardClassName = cn(
		'group relative border-0 rounded-2xl transition-all duration-300 backdrop-blur-xl overflow-hidden h-full',
		'bg-gradient-to-br from-blue-50/90 via-white/95 to-indigo-50/90',
		'dark:from-blue-950/40 dark:via-gray-900/90 dark:to-indigo-950/40',
		'shadow-lg hover:shadow-xl',
		'ring-1 ring-blue-200/50 dark:ring-blue-800/50 hover:ring-blue-300/70 dark:hover:ring-blue-700/70',
		className
	);

	if (variant === 'compact') {
		return (
			<Link href={detailPath} className="block">
				<Card className={cn(cardClassName, 'p-3')}>
					<div className="relative z-10 flex items-center gap-3">
						{/* Icon */}
						<div className="relative shrink-0">
							<div className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200/50 dark:from-blue-900/50 dark:to-indigo-900/50 dark:border-blue-700/30">
								{shouldShowFallbackIcon ? (
									<FiFolder className="w-5 h-5 text-blue-600 dark:text-blue-400" />
								) : (
									<Image
										src={item.icon_url!}
										alt={`${item.name} icon`}
										className="w-5 h-5 object-contain"
										width={20}
										height={20}
										unoptimized={isProblematicUrl(item.icon_url!)}
									/>
								)}
							</div>
						</div>

						{/* Content */}
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
									{item.name}
								</span>
								<SponsorBadge variant="compact" size="sm" showIcon={false} />
							</div>
							{categoryName && (
								<span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-theme-primary-10 text-theme-primary dark:bg-theme-primary-900/30 dark:text-theme-primary capitalize">
									{categoryName}
								</span>
							)}
						</div>

						<FiExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
					</div>
				</Card>
			</Link>
		);
	}

	// Default variant
	return (
		<Link href={detailPath} className="block">
			<Card className={cardClassName}>
				{/* Background pattern */}
				<div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-white/90 to-indigo-50/80 dark:from-blue-950/60 dark:via-gray-900/80 dark:to-indigo-950/80 transition-all duration-700" />
				<div
					className="absolute inset-0 opacity-5 dark:opacity-10"
					style={{
						backgroundImage:
							"url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%233b82f6' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' /%3E%3C/g%3E%3C/svg%3E\")"
					}}
				/>

				{/* Content */}
				<div className="relative z-10">
					<CardHeader className="flex gap-4 pb-2">
						<div className="flex flex-col grow gap-3 min-w-0">
							<div className="flex justify-between items-start gap-3">
								<div className="flex items-center gap-4">
									{/* Icon */}
									<div className="relative shrink-0">
										<div className="absolute inset-0 w-12 h-12 rounded-2xl bg-blue-500/30 dark:bg-blue-400/30 opacity-0 group-hover:opacity-100 group-hover:animate-ping pointer-events-none" />
										<div className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200/50 group-hover:from-blue-200 group-hover:to-indigo-200 dark:from-blue-900/50 dark:to-indigo-900/50 dark:border-blue-700/30 dark:group-hover:from-blue-800/50 dark:group-hover:to-indigo-800/50 shadow-sm group-hover:shadow-md group-hover:scale-105 group-hover:rotate-2">
												{shouldShowFallbackIcon ? (
													<FiFolder className="w-6 h-6 text-blue-600 dark:text-blue-400 transition-transform duration-300 group-hover:scale-110" />
												) : (
													<Image
														src={item.icon_url!}
														alt={`${item.name} icon`}
														className="w-6 h-6 object-contain transition-transform duration-300 group-hover:scale-110"
														width={24}
														height={24}
														unoptimized={isProblematicUrl(item.icon_url!)}
													/>
												)}
											</div>
									</div>

									{/* Name */}
									<div className="flex-1 min-w-0">
										<div className="text-lg sm:text-base font-semibold leading-tight text-left text-gray-900 dark:text-white mb-1 transition-colors duration-300 group-hover:text-gray-700 dark:group-hover:text-gray-200">
											{item.name}
										</div>
										<div className="w-0 h-0.5 bg-blue-300 dark:bg-blue-600 group-hover:w-12 transition-all duration-500 ease-out" />
									</div>
								</div>

								{/* Badge */}
								<SponsorBadge variant="default" size="sm" />
							</div>
						</div>
					</CardHeader>

					<CardBody className="pt-0 pb-4">
						{/* Category - styled to match regular Item cards using theme colors */}
						{categoryName && (
							<div className="mb-2">
								<span className="inline-block bg-theme-primary-10 px-3 py-2 text-xs font-semibold rounded-full bg-gradient-to-r from-theme-primary-100 to-theme-primary-100 text-theme-primary dark:from-theme-primary-900/30 dark:to-theme-primary-900/30 dark:text-theme-primary border border-theme-primary-10 dark:border-gray-600/30 capitalize shadow-sm">
									{categoryName}
								</span>
							</div>
						)}

						{/* Description */}
						{item.description && (
							<p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 transition-colors duration-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 font-medium line-clamp-2">
								{item.description}
							</p>
						)}

						{/* Tags - styled to match regular Item cards */}
						{tagNames.length > 0 && (
							<div className="flex flex-wrap gap-0.5 mt-2">
								{tagNames.slice(0, 4).map((tag, index) => (
									<span
										key={`tag-${index}`}
										className="text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 font-medium px-1 py-0.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300"
									>
										#{tag}
									</span>
								))}
							</div>
						)}

						{/* Rotation indicator */}
						{validSponsors.length > 1 && (
							<div className="flex items-center gap-1.5 mt-3">
								{validSponsors.map((_, idx) => (
									<button
										key={idx}
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											setCurrentIndex(idx);
										}}
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
					</CardBody>
				</div>
			</Card>
		</Link>
	);
}
