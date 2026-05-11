import { FiArrowRight, FiMessageCircle, FiStar } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
		<Card className="border border-gray-600/40 dark:border-gray-300/10 rounded-xl bg-transparent shadow-sm p-6">
			<CardHeader className="p-0 mb-2">
				<CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
					<FiMessageCircle className="w-5 h-5 text-theme-primary-500" />
					Recent Activity
				</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				{hasAny ? (
					<ul className="space-y-4">
						{comments.map((comment) => (
							<li
								key={comment.id}
								className="border-l-2 border-gray-200 dark:border-white/8 pl-4 py-1"
							>
								<div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
									<div className="flex items-center gap-2">
										<span>commented on</span>
										<Link
											href={`/items/${comment.itemSlug}`}
											className="text-theme-primary-600 dark:text-theme-primary-400 hover:underline truncate max-w-[24ch]"
										>
											{comment.itemSlug}
										</Link>
										{comment.rating > 0 && (
											<span className="inline-flex items-center gap-0.5 text-yellow-500">
												<FiStar className="w-3 h-3 fill-current" />
												{comment.rating}
											</span>
										)}
									</div>
									<span>{formatRelative(comment.createdAt)}</span>
								</div>
								<p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
									{truncate(comment.content)}
								</p>
							</li>
						))}
					</ul>
				) : (
					<div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
						{isOwn ? (
							<>
								<p>You haven&apos;t left any comments yet.</p>
								<Link
									href="/"
									className="inline-flex items-center gap-1 mt-2 text-theme-primary-600 dark:text-theme-primary-400 hover:underline"
								>
									Browse the directory <FiArrowRight className="w-3 h-3" />
								</Link>
							</>
						) : (
							<p>{displayName} hasn&apos;t left any comments yet.</p>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
