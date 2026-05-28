'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { FiSearch, FiX, FiList, FiGrid } from 'react-icons/fi';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type View = 'list' | 'grid';

interface UsersToolbarProps {
	query: string;
	view: View;
}

const DEBOUNCE_MS = 350;

export function UsersToolbar({ query, view }: UsersToolbarProps) {
	const t = useTranslations('usersDirectory');
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	function buildHref(overrides: Record<string, string | number | undefined>) {
		const raw = {
			...(query ? { q: query } : {}),
			...(view === 'list' ? { view: 'list' } : {}),
			...overrides
		};
		const query_params = Object.fromEntries(
			Object.entries(raw).filter(([, v]) => v !== undefined)
		) as Record<string, string | number>;
		return { pathname: '/client/users' as const, query: query_params };
	}

	function navigate(newQuery: string) {
		startTransition(() => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			router.push(buildHref({ q: newQuery || undefined, page: undefined }) as any);
		});
	}

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const val = e.currentTarget.value;
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => navigate(val.trim()), DEBOUNCE_MS);
	}

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (debounceRef.current) clearTimeout(debounceRef.current);
		navigate(((new FormData(e.currentTarget).get('q') as string) ?? '').trim());
	}

	useEffect(() => () => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
	}, []);

	return (
		<div className="sticky top-2 z-20">
			<div className="rounded-xl border border-gray-200/70 dark:border-white/6 bg-white/90 dark:bg-[#111111]/90 backdrop-blur-md shadow-md shadow-gray-900/5 dark:shadow-black/20">
				<div className="flex items-center gap-1.5 p-1.5">
					{/* Search form — client-side navigation, no hard reload */}
					<form onSubmit={handleSubmit} className="flex flex-1 items-center gap-1.5 min-w-0">
						<div className="relative flex-1 min-w-0">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
								<FiSearch className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
							</div>
							{/* key=query resets the uncontrolled input when server re-renders with a new query */}
							<input
								key={query}
								type="search"
								name="q"
								defaultValue={query}
								placeholder={t('SEARCH_PLACEHOLDER')}
								autoComplete="off"
								onChange={handleChange}
								className={cn(
									'w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-7 text-xs',
									'text-gray-900 placeholder:text-gray-400',
									'transition-all duration-200',
									'focus:border-theme-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-theme-primary-500/20',
									'dark:border-white/[0.06] dark:bg-white/[0.04] dark:text-gray-100 dark:placeholder:text-gray-500',
									'dark:focus:border-theme-primary-400 dark:focus:bg-white/[0.07] dark:focus:ring-theme-primary-500/20'
								)}
							/>
							{query && (
								<Link
									// eslint-disable-next-line @typescript-eslint/no-explicit-any
									href={buildHref({ q: undefined, page: undefined }) as any}
									className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
									aria-label={t('CLEAR_SEARCH')}
								>
									<FiX className="h-3 w-3" />
								</Link>
							)}
						</div>
						<button
							type="submit"
							disabled={isPending}
							className={cn(
								'hidden sm:inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-3 text-[11px] font-semibold',
								'bg-black text-white dark:bg-white dark:text-gray-900',
								isPending && 'opacity-70 cursor-wait'
							)}
						>
							{t('SEARCH_BUTTON')}
						</button>
					</form>

					{/* Divider */}
					<div className="hidden sm:block h-4 w-px bg-gray-200 dark:bg-white/[0.08] shrink-0" aria-hidden="true" />

					{/* View toggle — list / grid, persisted via URL */}
					<div
						role="group"
						aria-label={t('VIEW_TOGGLE_LABEL')}
						className="inline-flex shrink-0 items-center p-0.5 rounded-lg bg-gray-100 dark:bg-white/4 border border-gray-200 dark:border-white/6"
					>
						<Link
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							href={buildHref({ view: undefined, page: undefined }) as any}
							aria-current={view === 'grid' ? 'page' : undefined}
							className={cn(
								'inline-flex items-center gap-1 px-2.5 h-6 rounded-md text-[11px] font-medium transition-all duration-150',
								view === 'grid'
									? 'bg-white dark:bg-white/10 text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10'
									: 'text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
							)}
						>
							<FiGrid className="w-3 h-3" aria-hidden="true" />
							<span className="hidden sm:inline">{t('VIEW_GRID')}</span>
						</Link>
						<Link
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							href={buildHref({ view: 'list', page: undefined }) as any}
							aria-current={view === 'list' ? 'page' : undefined}
							className={cn(
								'inline-flex items-center gap-1 px-2.5 h-6 rounded-md text-[11px] font-medium transition-all duration-150',
								view === 'list'
									? 'bg-white dark:bg-white/10 text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10'
									: 'text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
							)}
						>
							<FiList className="w-3 h-3" aria-hidden="true" />
							<span className="hidden sm:inline">{t('VIEW_LIST')}</span>
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
