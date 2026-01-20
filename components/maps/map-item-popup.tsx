'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, ExternalLink, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MapItemPopupProps } from '@/lib/maps/types';

// Max length for description preview
const DESCRIPTION_MAX_LENGTH = 120;

/**
 * Truncate text to a maximum length with ellipsis.
 */
function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength).trim() + '...';
}

/**
 * Popup component that displays item preview information on the map.
 *
 * Features:
 * - Item icon, name, and category display
 * - Truncated description preview
 * - "View Details" link to item page
 * - Close button with keyboard support
 * - Focus trap for accessibility
 *
 * @example
 * ```tsx
 * <MapItemPopup
 *   item={{ slug: 'example', name: 'Example Item', category: 'Tools' }}
 *   isOpen={isPopupOpen}
 *   position={{ latitude: 40.7128, longitude: -74.0060 }}
 *   onClose={() => setIsPopupOpen(false)}
 *   locale="en"
 * />
 * ```
 */
export function MapItemPopup({
	item,
	isOpen,
	position,
	onClose,
	locale = 'en'
}: MapItemPopupProps): React.ReactElement | null {
	const popupRef = useRef<HTMLDivElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);

	// Focus close button when popup opens
	useEffect(() => {
		if (isOpen && closeButtonRef.current) {
			closeButtonRef.current.focus();
		}
	}, [isOpen]);

	// Handle escape key to close
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, onClose]);

	// Handle click outside to close
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
				onClose();
			}
		};

		// Delay adding listener to prevent immediate close
		const timeoutId = setTimeout(() => {
			document.addEventListener('click', handleClickOutside);
		}, 100);

		return () => {
			clearTimeout(timeoutId);
			document.removeEventListener('click', handleClickOutside);
		};
	}, [isOpen, onClose]);

	if (!isOpen) {
		return null;
	}

	const itemUrl = `/${locale}/item/${item.slug}`;
	const truncatedDescription = item.description
		? truncateText(item.description, DESCRIPTION_MAX_LENGTH)
		: null;

	return (
		<div
			ref={popupRef}
			className={cn(
				'absolute z-20 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg',
				'border border-gray-200 dark:border-gray-700',
				'transform -translate-x-1/2 -translate-y-full',
				'animate-in fade-in-0 zoom-in-95 duration-200'
			)}
			role="dialog"
			aria-label={`Details for ${item.name}`}
			style={{
				// Position will be set by parent based on marker position
				bottom: '100%',
				left: '50%',
				marginBottom: '12px'
			}}
		>
			{/* Arrow pointer */}
			<div
				className={cn(
					'absolute left-1/2 -translate-x-1/2 top-full',
					'w-0 h-0 border-l-8 border-r-8 border-t-8',
					'border-l-transparent border-r-transparent',
					'border-t-white dark:border-t-gray-800'
				)}
			/>

			{/* Header with icon and close button */}
			<div className="flex items-start gap-3 p-4 pb-2">
				{/* Item icon */}
				{item.icon ? (
					<img
						src={item.icon}
						alt=""
						className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700"
					/>
				) : (
					<div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
						<Tag className="w-6 h-6 text-gray-400" />
					</div>
				)}

				{/* Title and category */}
				<div className="flex-1 min-w-0">
					<h3 className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</h3>
					{item.category && (
						<span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
							{item.category}
						</span>
					)}
				</div>

				{/* Close button */}
				<button
					ref={closeButtonRef}
					type="button"
					onClick={onClose}
					className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
					aria-label="Close popup"
				>
					<X className="w-4 h-4 text-gray-500" />
				</button>
			</div>

			{/* Description */}
			{truncatedDescription && (
				<p className="px-4 pb-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
					{truncatedDescription}
				</p>
			)}

			{/* View Details link */}
			<div className="px-4 pb-4 pt-2">
				<Link
					href={itemUrl}
					className={cn(
						'inline-flex items-center gap-1.5 text-sm font-medium',
						'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300',
						'transition-colors'
					)}
				>
					View Details
					<ExternalLink className="w-3.5 h-3.5" />
				</Link>
			</div>
		</div>
	);
}

/**
 * Props for the standalone MapItemCard component.
 */
interface MapItemCardProps {
	/** Item slug for link */
	slug: string;
	/** Item name */
	name: string;
	/** Item icon URL */
	icon?: string;
	/** Category name */
	category?: string;
	/** Short description */
	description?: string;
	/** Locale for URL */
	locale?: string;
	/** Additional CSS classes */
	className?: string;
	/** Click handler (optional, will show as button instead of link) */
	onClick?: () => void;
}

/**
 * Standalone item card component for use outside of map popups.
 * Useful for item lists, search results, or sidebar displays.
 */
export function MapItemCard({
	slug,
	name,
	icon,
	category,
	description,
	locale = 'en',
	className,
	onClick
}: MapItemCardProps): React.ReactElement {
	const truncatedDescription = description ? truncateText(description, DESCRIPTION_MAX_LENGTH) : null;

	const content = (
		<>
			{/* Item icon */}
			{icon ? (
				<img
					src={icon}
					alt=""
					className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700"
				/>
			) : (
				<div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
					<Tag className="w-6 h-6 text-gray-400" />
				</div>
			)}

			{/* Content */}
			<div className="flex-1 min-w-0">
				<h3 className="font-semibold text-gray-900 dark:text-white truncate">{name}</h3>
				{category && (
					<span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
						{category}
					</span>
				)}
				{truncatedDescription && (
					<p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
						{truncatedDescription}
					</p>
				)}
			</div>
		</>
	);

	const baseClasses = cn(
		'flex items-start gap-3 p-3 rounded-lg transition-colors',
		'hover:bg-gray-50 dark:hover:bg-gray-800',
		className
	);

	if (onClick) {
		return (
			<button type="button" onClick={onClick} className={cn(baseClasses, 'w-full text-left')}>
				{content}
			</button>
		);
	}

	return (
		<Link href={`/${locale}/item/${slug}`} className={baseClasses}>
			{content}
		</Link>
	);
}
