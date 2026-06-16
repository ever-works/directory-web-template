'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2, Link, Twitter, Linkedin, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface SharePopoverProps {
	itemName: string;
	className?: string;
}

/**
 * Share button that opens a small popover with:
 * – Copy link (copies the current directory page URL)
 * – Share on Twitter/X
 * – Share on LinkedIn
 */
export function SharePopover({ itemName, className }: SharePopoverProps) {
	const t = useTranslations('common');
	const [open, setOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, [open]);

	const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
	const encodedUrl = encodeURIComponent(currentUrl);
	const encodedTitle = encodeURIComponent(itemName);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(currentUrl);
			setCopied(true);
			toast.success(t('LINK_COPIED'));
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast.error(t('SHARE_ERROR'));
		}
	};

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				title={t('SHARE')}
				onClick={() => setOpen((v) => !v)}
				className={cn(
					'w-9 h-9 inline-flex items-center justify-center rounded-lg',
					'bg-white dark:bg-white/3 text-gray-500 dark:text-gray-400',
					'border border-gray-200 dark:border-white/8',
					'hover:bg-gray-50 dark:hover:bg-white/6 hover:text-gray-700 dark:hover:text-gray-200',
					'transition-colors duration-150',
					className
				)}
			>
				<Share2 className="w-4 h-4" />
			</button>

			{open && (
				<div className="absolute left-0 top-full mt-2 w-48 z-50 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] shadow-lg p-1.5">
					<button
						type="button"
						onClick={handleCopy}
						className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
					>
						{copied ? <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <Link className="w-3.5 h-3.5 shrink-0" />}
						{t('COPY_LINK')}
					</button>

					<a
						href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
						target="_blank"
						rel="noopener noreferrer"
						onClick={() => setOpen(false)}
						className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
					>
						<Twitter className="w-3.5 h-3.5 shrink-0" />
						{t('SHARE_ON_X')}
					</a>

					<a
						href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
						target="_blank"
						rel="noopener noreferrer"
						onClick={() => setOpen(false)}
						className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
					>
						<Linkedin className="w-3.5 h-3.5 shrink-0" />
						{t('SHARE_ON_LINKEDIN')}
					</a>
				</div>
			)}
		</div>
	);
}
