"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FiArrowRight, FiHeart, FiMessageCircle, FiStar, FiUserPlus, FiUserCheck } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';

type ActivityFilter = 'all' | 'comment' | 'favorite' | 'follow';

const FILTER_THRESHOLD = 10;
const FILTER_CAP = 8;

export interface RecentComment {
	id: string;
	content: string;
	itemSlug: string;
	rating: number;
	createdAt: Date | string;
}

export interface RecentFavorite {
	id: string;
	itemSlug: string;
	itemName: string;
	itemIconUrl: string | null;
	createdAt: Date | string;
}

export interface RecentFollow {
	id: string;
	otherUserId: string;
	otherUsername: string | null;
	otherDisplayName: string | null;
	otherName: string;
	otherAvatar: string | null;
	direction: 'outgoing' | 'incoming';
	createdAt: Date | string;
}

type ActivityItem =
	| { kind: 'comment'; data: RecentComment }
	| { kind: 'favorite'; data: RecentFavorite }
	| { kind: 'follow'; data: RecentFollow };

interface RecentActivitySectionProps {
	comments: RecentComment[];
	favorites: RecentFavorite[];
	follows?: RecentFollow[];
	isOwn: boolean;
	displayName: string;
}

const truncate = (s: string, max = 180) => (s.length <= max ? s : `${s.slice(0, max).trimEnd()}…`);

const toDate = (v: Date | string) => (typeof v === 'string' ? new Date(v) : v);

export function RecentActivitySection({ comments, favorites, follows = [], isOwn, displayName }: RecentActivitySectionProps) {
	const t = useTranslations("profile");

	const formatRelative = (input: Date | string): string => {
		const date = toDate(input);
		const diff = Date.now() - date.getTime();
		const day = 86_400_000;
		if (diff < 3_600_000) return t('JUST_NOW');
		if (diff < day) return t('HOURS_AGO', { h: Math.floor(diff / 3_600_000) });
		if (diff < 7 * day) return t('DAYS_AGO', { d: Math.floor(diff / day) });
		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	};

	const [filter, setFilter] = useState<ActivityFilter>('all');

	// Merge and sort newest-first (memoized — recomputes only when input lists change)
	const allItems = useMemo<ActivityItem[]>(() => [
		...comments.map((c): ActivityItem => ({ kind: 'comment', data: c })),
		...favorites.map((f): ActivityItem => ({ kind: 'favorite', data: f })),
		...follows.map((f): ActivityItem => ({ kind: 'follow', data: f })),
	].sort((a, b) => toDate(b.data.createdAt).getTime() - toDate(a.data.createdAt).getTime()),
		[comments, favorites, follows]
	);

	// Per-kind counts for tab badges + threshold check
	const counts = useMemo(() => ({
		all: allItems.length,
		comment: comments.length,
		favorite: favorites.length,
		follow: follows.length,
	}), [allItems.length, comments.length, favorites.length, follows.length]);

	// Show filter tabs only once the section is long enough to benefit from them
	const showFilter = counts.all > FILTER_THRESHOLD;

	// Items visible in the current view (filtered + capped when tabs are shown)
	const items = useMemo<ActivityItem[]>(() => {
		if (!showFilter) return allItems;
		const filtered = filter === 'all' ? allItems : allItems.filter((it) => it.kind === filter);
		return filtered.slice(0, FILTER_CAP);
	}, [showFilter, filter, allItems]);

	const isEmpty = allItems.length === 0;

	const filters: Array<{ kind: ActivityFilter; labelKey: string; count: number }> = [
		{ kind: 'all', labelKey: 'ACTIVITY_FILTER_ALL', count: counts.all },
		{ kind: 'comment', labelKey: 'ACTIVITY_FILTER_COMMENTS', count: counts.comment },
		{ kind: 'favorite', labelKey: 'ACTIVITY_FILTER_FAVORITES', count: counts.favorite },
		{ kind: 'follow', labelKey: 'ACTIVITY_FILTER_FOLLOWS', count: counts.follow },
	];

	return (
		<div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm overflow-hidden">
			{/* Header */}
			<div className="flex items-center gap-2 px-5 py-4 border-b border-neutral-100 dark:border-white/6">
				<span className="p-1.5 bg-theme-primary-50 dark:bg-theme-primary-500/12 rounded-lg text-theme-primary-600 dark:text-theme-primary-400">
					<FiMessageCircle className="w-3.5 h-3.5" />
				</span>
				<h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
					{t("RECENT_ACTIVITY_SECTION")}
				</h3>
				{!isEmpty && (
					<span className="ml-auto text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">
						{counts.all} {t(counts.all !== 1 ? 'ACTIVITY_PLURAL' : 'ACTIVITY_SINGULAR')}
					</span>
				)}
			</div>

			{/* Filter tabs — only when there's enough activity to make filtering useful */}
			{showFilter && (
				<div
					role="tablist"
					aria-label={t('RECENT_ACTIVITY_SECTION')}
					className="flex items-center gap-1 px-5 py-2 border-b border-neutral-100 dark:border-white/6 overflow-x-auto"
				>
					{filters.map((f) => {
						const isActive = filter === f.kind;
						return (
							<button
								key={f.kind}
								type="button"
								role="tab"
								aria-selected={isActive}
								onClick={() => setFilter(f.kind)}
								className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-150 whitespace-nowrap ${
									isActive
										? 'bg-theme-primary-50 text-theme-primary-700 dark:bg-theme-primary-500/12 dark:text-theme-primary-300'
										: 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/5'
								}`}
							>
								<span>{t(f.labelKey)}</span>
								<span
									className={`text-[10px] tabular-nums ${
										isActive ? 'text-theme-primary-600/80 dark:text-theme-primary-400/80' : 'text-neutral-400 dark:text-neutral-500'
									}`}
								>
									{f.count}
								</span>
							</button>
						);
					})}
				</div>
			)}

			{/* Content */}
			<div className="px-5 py-4">
				{isEmpty ? (
					<div className="py-8 flex flex-col items-center text-center gap-3">
						<span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-100 dark:bg-white/8 text-neutral-400">
							<FiMessageCircle className="w-5 h-5" />
						</span>
						<div className="space-y-1">
							<p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
								{isOwn ? t("NO_ACTIVITY_OWN") : t("NO_ACTIVITY_OTHER", { name: displayName })}
							</p>
							{isOwn && (
								<p className="text-xs text-neutral-400 dark:text-neutral-500">
									{t("ACTIVITY_HINT")}
								</p>
							)}
						</div>
						{isOwn && (
							<Link
								href="/"
								className="inline-flex items-center gap-1.5 text-sm text-theme-primary-600 dark:text-theme-primary-400 hover:underline font-medium transition-colors duration-150"
							>
								{t("BROWSE_DIRECTORY")}
								<FiArrowRight className="w-3.5 h-3.5" />
							</Link>
						)}
					</div>
				) : items.length === 0 ? (
					<p className="py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
						{t('NO_ACTIVITY_FILTERED')}
					</p>
				) : (
					<ol className="relative space-y-0">
						{/* Timeline track */}
						<div className="absolute left-3.75 top-3 bottom-3 w-px bg-neutral-100 dark:bg-white/8" aria-hidden="true" />

						{items.map((item) => (
							<li key={`${item.kind}-${item.data.id}`} className="relative flex gap-4 pb-5 last:pb-0">
								{/* Timeline dot — different color per type */}
								<div className="relative z-10 mt-1.5 shrink-0 flex items-center justify-center w-7.5 h-7.5">
									{item.kind === 'comment' ? (
										<div className="w-2 h-2 rounded-full bg-theme-primary-400 dark:bg-theme-primary-500 ring-2 ring-white dark:ring-neutral-950" />
									) : item.kind === 'favorite' ? (
										<div className="w-2 h-2 rounded-full bg-rose-400 dark:bg-rose-500 ring-2 ring-white dark:ring-neutral-950" />
									) : (
										<div className="w-2 h-2 rounded-full bg-violet-400 dark:bg-violet-500 ring-2 ring-white dark:ring-neutral-950" />
									)}
								</div>

								{/* Card */}
								<div className="flex-1 min-w-0 rounded-lg border border-neutral-100 dark:border-white/6 bg-neutral-50/60 dark:bg-white/3 p-3 hover:border-neutral-200 dark:hover:border-white/10 hover:bg-white dark:hover:bg-white/5 transition-all duration-150">
									{item.kind === 'comment' ? (
										<CommentEntry comment={item.data} formatRelative={formatRelative} />
									) : item.kind === 'favorite' ? (
										<FavoriteEntry favorite={item.data} formatRelative={formatRelative} />
									) : (
										<FollowEntry follow={item.data} formatRelative={formatRelative} />
									)}
								</div>
							</li>
						))}
					</ol>
				)}
			</div>
		</div>
	);
}

function CommentEntry({
	comment,
	formatRelative,
}: {
	comment: RecentComment;
	formatRelative: (d: Date | string) => string;
}) {
	const t = useTranslations("profile");
	return (
		<>
			<div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
				<div className="flex items-center gap-1.5 min-w-0 text-xs text-neutral-500 dark:text-neutral-400">
					<FiMessageCircle className="w-3 h-3 shrink-0 text-theme-primary-400" />
					<span className="shrink-0">{t('ACTIVITY_VERB_REVIEWED')}</span>
					<Link
						href={`/items/${comment.itemSlug}`}
						className="font-medium text-theme-primary-600 dark:text-theme-primary-400 hover:underline truncate max-w-[18ch] transition-colors duration-150"
					>
						{comment.itemSlug}
					</Link>
					{comment.rating > 0 && (
						<span className="inline-flex items-center gap-0.5 text-amber-500 shrink-0 ml-0.5">
							{Array.from({ length: comment.rating }).map((_, i) => (
								<FiStar key={i} className="w-2.5 h-2.5 fill-current" />
							))}
						</span>
					)}
				</div>
				<time
					className="text-[11px] text-neutral-400 dark:text-neutral-500 shrink-0 tabular-nums"
					dateTime={new Date(comment.createdAt).toISOString()}
				>
					{formatRelative(comment.createdAt)}
				</time>
			</div>
			<p className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed">
				&ldquo;{truncate(comment.content)}&rdquo;
			</p>
		</>
	);
}

function FavoriteEntry({
	favorite,
	formatRelative,
}: {
	favorite: RecentFavorite;
	formatRelative: (d: Date | string) => string;
}) {
	const t = useTranslations("profile");
	return (
		<div className="flex items-center justify-between gap-2 flex-wrap">
			<div className="flex items-center gap-1.5 min-w-0 text-xs text-neutral-500 dark:text-neutral-400">
				<FiHeart className="w-3 h-3 shrink-0 text-rose-400 fill-current" />
				<span className="shrink-0">{t('ACTIVITY_VERB_LIKED')}</span>
				<Link
					href={`/items/${favorite.itemSlug}`}
					className="font-medium text-neutral-800 dark:text-neutral-200 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 hover:underline truncate max-w-[22ch] transition-colors duration-150"
				>
					{favorite.itemName}
				</Link>
			</div>
			<time
				className="text-[11px] text-neutral-400 dark:text-neutral-500 shrink-0 tabular-nums"
				dateTime={new Date(favorite.createdAt).toISOString()}
			>
				{formatRelative(favorite.createdAt)}
			</time>
		</div>
	);
}

function FollowEntry({
	follow,
	formatRelative,
}: {
	follow: RecentFollow;
	formatRelative: (d: Date | string) => string;
}) {
	const t = useTranslations("profile");
	const otherLabel = follow.otherDisplayName || follow.otherName || follow.otherUsername || 'someone';
	const otherHref = follow.otherUsername ? `/client/profile/${follow.otherUsername}` : null;
	const verb = follow.direction === 'outgoing' ? t('ACTIVITY_VERB_FOLLOWED') : t('ACTIVITY_VERB_FOLLOWED_BY');
	const Icon = follow.direction === 'outgoing' ? FiUserPlus : FiUserCheck;
	return (
		<div className="flex items-center justify-between gap-2 flex-wrap">
			<div className="flex items-center gap-1.5 min-w-0 text-xs text-neutral-500 dark:text-neutral-400">
				<Icon className="w-3 h-3 shrink-0 text-violet-500" />
				<span className="shrink-0">{verb}</span>
				{otherHref ? (
					<Link
						href={otherHref}
						className="font-medium text-neutral-800 dark:text-neutral-200 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 hover:underline truncate max-w-[22ch] transition-colors duration-150"
					>
						{otherLabel}
					</Link>
				) : (
					<span className="font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[22ch]">
						{otherLabel}
					</span>
				)}
			</div>
			<time
				className="text-[11px] text-neutral-400 dark:text-neutral-500 shrink-0 tabular-nums"
				dateTime={new Date(follow.createdAt).toISOString()}
			>
				{formatRelative(follow.createdAt)}
			</time>
		</div>
	);
}
