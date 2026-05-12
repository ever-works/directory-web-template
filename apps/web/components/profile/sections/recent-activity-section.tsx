import { FiArrowRight, FiMessageCircle, FiStar } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';

export interface RecentComment {
	id: string;
	content: string;
	itemSlug: string;
	rating: number;
	createdAt: Date | string;
}

interface RecentActivitySectionProps {
	comments: RecentComment[];
	isOwn: boolean;
	displayName: string;
}

const formatRelative = (input: Date | string) => {
	const date = typeof input === 'string' ? new Date(input) : input;
	const diff = Date.now() - date.getTime();
	const day = 86_400_000;
	if (diff < 3_600_000) return 'just now';
	if (diff < day) {
		const h = Math.floor(diff / 3_600_000);
		return `${h}h ago`;
	}
	if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
	return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const truncate = (s: string, max = 180) => (s.length <= max ? s : `${s.slice(0, max).trimEnd()}…`);

export function RecentActivitySection({ comments, isOwn, displayName }: RecentActivitySectionProps) {
	return (
		<div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm overflow-hidden">
			{/* Header */}
			<div className="flex items-center gap-2 px-5 py-4 border-b border-neutral-100 dark:border-white/6">
				<span className="p-1.5 bg-theme-primary-50 dark:bg-theme-primary-500/12 rounded-lg text-theme-primary-600 dark:text-theme-primary-400">
					<FiMessageCircle className="w-3.5 h-3.5" />
				</span>
				<h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Recent Activity</h3>
				{comments.length > 0 && (
					<span className="ml-auto text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">
						{comments.length} comment{comments.length !== 1 ? 's' : ''}
					</span>
				)}
			</div>

			{/* Content */}
			<div className="px-5 py-4">
				{comments.length > 0 ? (
					<ol className="relative space-y-0">
						{/* Timeline track */}
						<div className="absolute left-3.75 top-3 bottom-3 w-px bg-neutral-100 dark:bg-white/8" aria-hidden="true" />

						{comments.map((comment, idx) => (
							<li key={comment.id} className="relative flex gap-4 pb-5 last:pb-0">
								{/* Timeline dot */}
								<div className="relative z-10 mt-1.5 shrink-0 flex items-center justify-center w-7.5 h-7.5">
									<div className="w-2 h-2 rounded-full bg-theme-primary-400 dark:bg-theme-primary-500 ring-2 ring-white dark:ring-neutral-950" />
								</div>

								{/* Card */}
								<div className="flex-1 min-w-0 rounded-lg border border-neutral-100 dark:border-white/6 bg-neutral-50/60 dark:bg-white/3 p-3 group hover:border-neutral-200 dark:hover:border-white/10 hover:bg-white dark:hover:bg-white/5 transition-all duration-150">
									{/* Meta row */}
									<div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
										<div className="flex items-center gap-1.5 min-w-0 text-xs text-neutral-500 dark:text-neutral-400">
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

									{/* Comment text */}
									<p className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed">
										&ldquo;{truncate(comment.content)}&rdquo;
									</p>
								</div>
							</li>
						))}
					</ol>
				) : (
					/* Empty state */
					<div className="py-8 flex flex-col items-center text-center gap-3">
						<span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-100 dark:bg-white/8 text-neutral-400">
							<FiMessageCircle className="w-5 h-5" />
						</span>
						<div className="space-y-1">
							<p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
								{isOwn ? 'No activity yet' : `${displayName} hasn't commented yet`}
							</p>
							{isOwn && (
								<p className="text-xs text-neutral-400 dark:text-neutral-500">
									Comments you leave on tools will appear here.
								</p>
							)}
						</div>
						{isOwn && (
							<Link
								href="/"
								className="inline-flex items-center gap-1.5 text-sm text-theme-primary-600 dark:text-theme-primary-400 hover:underline font-medium transition-colors duration-150"
							>
								Browse the directory
								<FiArrowRight className="w-3.5 h-3.5" />
							</Link>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
