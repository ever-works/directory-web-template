"use client";

import { useTranslations } from "next-intl";
import { FiArrowRight, FiHeart, FiMessageCircle, FiStar, FiUserPlus, FiUserCheck } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';

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

	// Merge and sort newest-first
	const items: ActivityItem[] = [
		...comments.map((c): ActivityItem => ({ kind: 'comment', data: c })),
		...favorites.map((f): ActivityItem => ({ kind: 'favorite', data: f })),
		...follows.map((f): ActivityItem => ({ kind: 'follow', data: f })),
	].sort((a, b) => toDate(b.data.createdAt).getTime() - toDate(a.data.createdAt).getTime());

	const isEmpty = items.length === 0;

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
						{items.length} {t(items.length !== 1 ? 'ACTIVITY_PLURAL' : 'ACTIVITY_SINGULAR')}
					</span>
				)}
			</div>

			{/* Content */}
			<div className="px-5 py-4">
				{!isEmpty ? (
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
				) : (
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
	return (
		<>
			<div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
				<div className="flex items-center gap-1.5 min-w-0 text-xs text-neutral-500 dark:text-neutral-400">
					<FiMessageCircle className="w-3 h-3 shrink-0 text-theme-primary-400" />
					<span className="shrink-0">Reviewed</span>
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
	return (
		<div className="flex items-center justify-between gap-2 flex-wrap">
			<div className="flex items-center gap-1.5 min-w-0 text-xs text-neutral-500 dark:text-neutral-400">
				<FiHeart className="w-3 h-3 shrink-0 text-rose-400 fill-current" />
				<span className="shrink-0">Liked</span>
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
	const otherLabel = follow.otherDisplayName || follow.otherName || follow.otherUsername || 'someone';
	const otherHref = follow.otherUsername ? `/client/profile/${follow.otherUsername}` : null;
	const verb = follow.direction === 'outgoing' ? 'Followed' : 'Followed by';
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
