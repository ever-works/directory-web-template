'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { isLikelyEmoji, isLikelyUrl } from '@/lib/utils/icon-detection';

interface CollectionIconProps {
	iconUrl?: string | null;
	/** Glyph to render when icon_url is empty or a URL that failed to load. */
	fallback?: string;
	/** Tailwind classes for the outer wrapper. Caller controls size. */
	className?: string;
	/** Tailwind classes for the inner glyph / image; defaults to filling the wrapper. */
	imageClassName?: string;
	/** Accessible label override; defaults to empty (icon is decorative). */
	alt?: string;
}

/**
 * Renders a collection icon stored as `icon_url`.
 *
 * - If the value looks like a URL (`https://…` / `/relative` / `data:image/…`)
 *   it's rendered through `<img>`, with a React-state error fallback to the
 *   provided glyph so a 404 doesn't leave the slot blank.
 * - If the value is a single emoji glyph (or any short non-URL string) it's
 *   rendered as text — keeps existing emoji-only collections working.
 * - Otherwise the fallback glyph is shown.
 */
export function CollectionIcon({
	iconUrl,
	fallback = '📦',
	className,
	imageClassName,
	alt = '',
}: CollectionIconProps) {
	const trimmed = iconUrl?.trim() ?? '';
	const looksUrl = isLikelyUrl(trimmed);
	const [imgError, setImgError] = useState(false);

	// Reset img-error state when the URL itself changes so a corrected URL
	// can recover from a prior failure without a remount.
	useEffect(() => {
		setImgError(false);
	}, [trimmed]);

	if (looksUrl && !imgError) {
		return (
			<span className={cn('inline-flex items-center justify-center overflow-hidden', className)}>
				<img
					src={trimmed}
					alt={alt}
					className={cn('w-full h-full object-contain', imageClassName)}
					onError={() => setImgError(true)}
					loading="lazy"
				/>
			</span>
		);
	}

	const glyph = isLikelyEmoji(trimmed) ? trimmed : fallback;

	return (
		<span className={cn('inline-flex items-center justify-center leading-none', className)} aria-hidden={!alt}>
			{glyph}
		</span>
	);
}
