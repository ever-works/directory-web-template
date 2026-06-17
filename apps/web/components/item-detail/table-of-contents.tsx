'use client';

import { useEffect, useRef, useState } from 'react';
import { List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { TocHeading } from '@/lib/utils/extract-headings';

interface TableOfContentsProps {
	headings: TocHeading[];
}

/**
 * Floating glass ToC widget fixed to the right edge of the viewport.
 * Collapsed: a small frosted-glass pill showing only the List icon.
 * Hover/focus: a panel slides in from the right with the full heading list
 * and an IntersectionObserver-driven active highlight.
 *
 * Only renders when there are ≥ 3 headings.
 */
export function TableOfContents({ headings }: TableOfContentsProps) {
	const t = useTranslations('itemDetail');
	const [activeId, setActiveId] = useState<string>('');
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	/* ── Active heading tracking ─────────────────────────────────── */
	useEffect(() => {
		if (headings.length === 0) return;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setActiveId(entry.target.id);
						break;
					}
				}
			},
			{ rootMargin: '0px 0px -60% 0px', threshold: 0 }
		);

		headings.forEach(({ id }) => {
			const el = document.getElementById(id);
			if (el) observer.observe(el);
		});

		return () => observer.disconnect();
	}, [headings]);

	/* ── Close on outside click (mobile tap-away) ────────────────── */
	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, [open]);

	if (headings.length < 3) return null;

	const glassBase =
		'bg-white/70 dark:bg-black/50 backdrop-blur-2xl backdrop-saturate-150 border border-white/40 dark:border-white/10 shadow-xl shadow-black/10 dark:shadow-black/40';

	return (
		<div
			ref={containerRef}
			className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center"
			onMouseEnter={() => setOpen(true)}
			onMouseLeave={() => setOpen(false)}
		>
			{/* ── Expanded panel ──────────────────────────────────────── */}
			<div
				className={cn(
					'mr-2 w-56 rounded-2xl p-3 overflow-hidden',
					glassBase,
					'transition-all duration-300 ease-out origin-right',
					open
						? 'opacity-100 translate-x-0 pointer-events-auto'
						: 'opacity-0 translate-x-3 pointer-events-none'
				)}
			>
				<p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2 mb-2">
					{t('TABLE_OF_CONTENTS', { defaultValue: 'On this page' })}
				</p>

				<nav aria-label="Table of contents">
					<ul className="space-y-0.5">
						{headings.map(({ id, text, level }) => (
							<li key={id}>
								<a
									href={`#${id}`}
									onClick={(e) => {
										e.preventDefault();
										document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
										setActiveId(id);
										setOpen(false);
									}}
									className={cn(
										'block text-[11px] leading-snug rounded-lg px-2 py-1.5 transition-all duration-150',
										level === 3 && 'pl-4',
										activeId === id
											? 'text-theme-primary-600 dark:text-theme-primary-400 bg-theme-primary-50/80 dark:bg-theme-primary-500/15 font-medium'
											: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8'
									)}
								>
									{text}
								</a>
							</li>
						))}
					</ul>
				</nav>
			</div>

			{/* ── Collapsed trigger pill ───────────────────────────────── */}
			<button
				type="button"
				aria-label={t('TABLE_OF_CONTENTS', { defaultValue: 'On this page' })}
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
				className={cn(
					'flex flex-col items-center justify-center gap-1 w-9 rounded-l-2xl rounded-r-none py-4',
					glassBase,
					'transition-all duration-200',
					open
						? 'text-theme-primary-600 dark:text-theme-primary-400'
						: 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100'
				)}
			>
				<List className="w-4 h-4 shrink-0" />

				{/* Mini progress dots — one per heading, active one highlighted */}
				<div className="flex flex-col gap-0.5">
					{headings.map(({ id }) => (
						<span
							key={id}
							className={cn(
								'block rounded-full transition-all duration-200',
								id === activeId
									? 'w-1.5 h-1.5 bg-theme-primary-500'
									: 'w-1 h-1 bg-gray-300 dark:bg-gray-600'
							)}
						/>
					))}
				</div>
			</button>
		</div>
	);
}
