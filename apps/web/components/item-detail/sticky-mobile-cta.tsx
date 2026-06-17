'use client';

import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface StickyMobileCTAProps {
	sourceUrl?: string;
	name: string;
}

/**
 * Fixed bottom bar visible only on mobile (<lg) once the user scrolls
 * past the hero action bar. Keeps the primary "Visit Website" CTA
 * accessible without forcing users to scroll back to the top.
 */
export function StickyMobileCTA({ sourceUrl, name }: StickyMobileCTAProps) {
	const t = useTranslations('common');
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const onScroll = () => setVisible(window.scrollY > 200);
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	if (!sourceUrl) return null;

	return (
		<div
			className={cn(
				'fixed bottom-0 inset-x-0 z-50 lg:hidden',
				'border-t border-gray-200 dark:border-white/10 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm',
				'px-4 py-3 flex items-center gap-3',
				'transition-transform duration-200 ease-in-out',
				visible ? 'translate-y-0' : 'translate-y-full'
			)}
		>
			<div className="flex-1 min-w-0">
				<p className="text-xs font-medium text-gray-900 dark:text-white truncate">{name}</p>
			</div>
			<a
				href={sourceUrl}
				target="_blank"
				rel="noreferrer"
				className="inline-flex shrink-0 items-center gap-2 h-9 px-4 text-xs font-semibold rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors duration-150 shadow-sm"
			>
				<Globe className="w-3.5 h-3.5" />
				{t('VISIT_WEBSITE')}
			</a>
		</div>
	);
}
