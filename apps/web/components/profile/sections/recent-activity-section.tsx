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
	if (diff < day) {
		const h = Math.max(1, Math.floor(diff / 3_600_000));
		return `${h}h ago`;
	}
	if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
	return date.toLocaleDateString();
};

const truncate = (s: string, max = 200) => (s.length <= max ? s : `${s.slice(0, max).trimEnd()}…`);

export function RecentActivitySection({ comments, isOwn, displayName }: RecentActivitySectionProps) {
	const hasAny = comments.length > 0;

	return (
		<div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm p-6">
			<div className="flex items-center gap-2 mb-4">
				<span className="p-1.5 bg-neutral-100 dark:bg-white/8 rounded-lg text-theme-primary-600 dark:text-theme-primary-400">
					<FiMessageCircle className="w-3.5 h-3.5" />
				</span>
				<h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Recent Activity</h3>
			</div>

			{hasAny ? (
				<ul className="space-y-3">
					{comments.map((comment) => (
						<li
							key={comment.id}
							className="rounded-lg border border-neutral-100 dark:border-white/6 bg-neutral-50 dark:bg-white/3 p-3 transition-colors duration-150 hover:bg-neutral-100 dark:hover:bg-white/5"
						>
							<div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">
								<div className="flex items-center gap-1.5 min-w-0">
									<FiMessageCircle className="w-3 h-3 shrink-0" />
									<span className="shrink-0">on</span>
									<Link
										href={`/items/${comment.itemSlug}`}
										className="text-theme-primary-600 dark:text-theme-primary-400 hover:underline truncate max-w-[20ch]"
									>
										{comment.itemSlug}
									</Link>
									{comment.rating > 0 && (
										<span className="inline-flex items-center gap-0.5 text-yellow-500 shrink-0">
											<FiStar className="w-3 h-3 fill-current" />
											<span className="font-medium">{comment.rating}</span>
										</span>
									)}
								</div>
								<span className="shrink-0 ml-2">{formatRelative(comment.createdAt)}</span>
							</div>
							<p className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed">
								{truncate(comment.content)}
							</p>
						</li>
					))}
				</ul>
			) : (
				<div className="text-center py-8">
					<span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-100 dark:bg-white/8 text-neutral-400 mb-3">
						<FiMessageCircle className="w-5 h-5" />
					</span>
					<p className="text-sm text-neutral-500 dark:text-neutral-400">
						{isOwn ? (
							<>You haven&apos;t left any comments yet.</>
						) : (
							<>{displayName} hasn&apos;t left any comments yet.</>
						)}
					</p>
					{isOwn && (
						<Link
							href="/"
							className="inline-flex items-center gap-1 mt-2 text-sm text-theme-primary-600 dark:text-theme-primary-400 hover:underline"
						>
							Browse the directory <FiArrowRight className="w-3.5 h-3.5" />
						</Link>
					)}
				</div>
			)}
		</div>
	);
}
