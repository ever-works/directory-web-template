"use client";

import { useState } from "react";
import { Trash2, MessageSquare, X, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/container";
import { UniversalPagination } from "@/components/universal-pagination";
import DeleteCommentDialog from "@/components/admin/comments/delete-comment-dialog";
import { useAdminComments, AdminCommentItem } from "@/hooks/use-admin-comments";
import { useAdminFilters } from "@/hooks/use-admin-filters";
import { AdminSearchBar, AdminActiveFilters } from "@/components/admin/shared";
import { useTranslations } from "next-intl";
import { useNavigation } from "@/components/providers";

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
	"bg-linear-to-br from-blue-500 to-indigo-600",
	"bg-linear-to-br from-emerald-500 to-teal-600",
	"bg-linear-to-br from-violet-500 to-purple-600",
	"bg-linear-to-br from-amber-500 to-orange-600",
	"bg-linear-to-br from-pink-500 to-rose-600",
];

const SPINNER = (
	<svg className="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
		<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
		<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
	</svg>
);

const CARD = "bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl";
const PULSE = "animate-pulse rounded-lg bg-gray-100 dark:bg-white/6";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
	return (
		<div className="min-h-screen pb-20" aria-busy="true" aria-label="Loading comments…">
			{/* Header */}
			<div className="mb-8">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className={`w-11 h-11 rounded-xl ${PULSE} shrink-0`} />
						<div>
							<div className={`h-5 w-36 ${PULSE} mb-1.5`} />
							<div className={`h-3.5 w-48 ${PULSE}`} />
						</div>
					</div>
				</div>
				<div className="mt-5 h-px bg-gray-100 dark:bg-white/6" />
			</div>
			{/* Search */}
			<div className={`h-11 w-full rounded-xl ${PULSE} mb-6`} />
			{/* Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{Array.from({ length: 6 }, (_, i) => (
					<div key={i} className={`${CARD} p-4`}>
						<div className="flex items-center gap-3 mb-3">
							<div className={`w-9 h-9 rounded-full ${PULSE} shrink-0`} />
							<div className="flex-1">
								<div className={`h-3.5 w-28 ${PULSE} mb-1.5`} />
								<div className={`h-3 w-20 ${PULSE}`} />
							</div>
							<div className={`h-5 w-12 rounded-full ${PULSE}`} />
						</div>
						<div className="space-y-1.5 mb-4">
							<div className={`h-3.5 w-full ${PULSE}`} />
							<div className={`h-3.5 w-5/6 ${PULSE}`} />
							<div className={`h-3.5 w-4/6 ${PULSE}`} />
						</div>
						<div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/6">
							<div className={`h-3 w-24 ${PULSE}`} />
							<div className="flex gap-1">
								<div className={`w-7 h-7 rounded-lg ${PULSE}`} />
								<div className={`w-7 h-7 rounded-lg ${PULSE}`} />
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ─── Rating stars ─────────────────────────────────────────────────────────────

function RatingStars({ rating }: { rating: number }) {
	return (
		<span className="inline-flex items-center gap-0.5">
			{Array.from({ length: 5 }, (_, i) => (
				<Star
					key={i}
					className={cn(
						"w-3 h-3",
						i < rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200 dark:fill-white/10 dark:text-white/10"
					)}
				/>
			))}
		</span>
	);
}

// ─── Comment card ─────────────────────────────────────────────────────────────

interface CommentCardProps {
	comment: AdminCommentItem;
	isDeleting: boolean;
	onPreview: (comment: AdminCommentItem) => void;
	onDelete: (comment: AdminCommentItem) => void;
	unknownUser: string;
}

function CommentCard({ comment, isDeleting, onPreview, onDelete, unknownUser }: CommentCardProps) {
	const colorIndex = (comment.user.name || comment.user.email || "U").charCodeAt(0) % AVATAR_GRADIENTS.length;
	const displayName = comment.user.name || comment.user.email || unknownUser;
	const initial = displayName.charAt(0).toUpperCase();

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={() => onPreview(comment)}
			onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onPreview(comment)}
			className={cn(
				CARD,
				"flex flex-col p-4 group transition-all duration-150 cursor-pointer",
				"hover:shadow-md hover:border-gray-200 dark:hover:border-white/12",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
			)}
		>
			{/* User row */}
			<div className="flex items-start gap-3 mb-3">
				<div className={cn(
					"w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0",
					"ring-2 ring-white dark:ring-gray-900/80",
					AVATAR_GRADIENTS[colorIndex]
				)}>
					{comment.user.image ? (
						<img src={comment.user.image} alt={initial} className="w-full h-full rounded-full object-cover" />
					) : initial}
				</div>

				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium text-gray-900 dark:text-white truncate leading-tight">
						{displayName}
					</p>
					<p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
						{comment.createdAt ? new Date(comment.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}
					</p>
				</div>

				{comment.rating !== null && (
					<div className="shrink-0">
						<RatingStars rating={comment.rating} />
					</div>
				)}
			</div>

			{/* Truncated content — fills remaining space */}
			<p className="flex-1 text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3 mb-3">
				{comment.content}
			</p>

			{/* Footer */}
			<div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/6 mt-auto">
				<div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 min-w-0">
					<MessageSquare className="w-3 h-3 shrink-0" />
					<span className="truncate">{comment.itemId}</span>
				</div>

				<button
					type="button"
					disabled={isDeleting}
					onClick={(e) => { e.stopPropagation(); onDelete(comment); }}
					aria-label="Delete comment"
					className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 shrink-0"
				>
					{isDeleting ? SPINNER : <Trash2 className="w-3.5 h-3.5" />}
				</button>
			</div>
		</div>
	);
}

// ─── Full-comment popup ───────────────────────────────────────────────────────

interface CommentPreviewPopupProps {
	comment: AdminCommentItem | null;
	onClose: () => void;
	onDelete: (comment: AdminCommentItem) => void;
	isDeleting: boolean;
	unknownUser: string;
	unknownDate: string;
	deleteLabel: string;
}

function CommentPreviewPopup({ comment, onClose, onDelete, isDeleting, unknownUser, unknownDate, deleteLabel }: CommentPreviewPopupProps) {
	if (!comment) return null;

	const colorIndex = (comment.user.name || comment.user.email || "U").charCodeAt(0) % AVATAR_GRADIENTS.length;
	const displayName = comment.user.name || comment.user.email || unknownUser;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div className="w-full max-w-md bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/8 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
				{/* Header */}
				<div className="px-5 py-4 border-b border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/1.5 flex items-start gap-3">
					<div className={cn(
						"w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0",
						"ring-2 ring-white dark:ring-gray-900/80",
						AVATAR_GRADIENTS[colorIndex]
					)}>
						{comment.user.image ? (
							<img src={comment.user.image} alt={displayName.charAt(0)} className="w-full h-full rounded-full object-cover" />
						) : displayName.charAt(0).toUpperCase()}
					</div>

					<div className="flex-1 min-w-0">
						<p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
						<p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
							{comment.createdAt ? new Date(comment.createdAt).toLocaleString() : unknownDate}
						</p>
						{comment.rating !== null && (
							<div className="mt-1.5 flex items-center gap-2">
								<RatingStars rating={comment.rating} />
								<span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">{comment.rating}/5</span>
							</div>
						)}
					</div>

					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-white/8 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 shrink-0"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Comment body */}
				<div className="px-5 py-4">
					<p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words max-h-64 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full -mr-2 [&::-webkit-scrollbar]:w-1">
						{comment.content}
					</p>
				</div>

				{/* Footer */}
				<div className="px-5 py-3 border-t border-gray-100 dark:border-white/8 bg-gray-50/40 dark:bg-white/1.5 flex items-center justify-between gap-3">
					<div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 min-w-0">
						<MessageSquare className="w-3 h-3 shrink-0" />
						<span className="truncate">{comment.itemId}</span>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={onClose}
							className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
						>
							Close
						</button>
						<button
							type="button"
							disabled={isDeleting}
							onClick={() => { onClose(); onDelete(comment); }}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-500/20 transition-all duration-150 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
						>
							<Trash2 className="w-3.5 h-3.5" />
							{deleteLabel}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCommentsPage() {
	const t = useTranslations("admin.ADMIN_COMMENTS_PAGE");
	const [currentPage, setCurrentPage] = useState(1);
	const [previewComment, setPreviewComment] = useState<AdminCommentItem | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [commentToDelete, setCommentToDelete] = useState<AdminCommentItem | null>(null);

	const {
		searchTerm,
		setSearchTerm,
		debouncedSearchTerm,
		isSearching,
		hasActiveSearch,
		hasActiveFilters,
		clearAllFilters,
	} = useAdminFilters({ onFiltersChange: () => setCurrentPage(1) });

	const {
		comments,
		isLoading,
		isFetching,
		isDeleting,
		totalPages,
		totalComments,
		deleteComment,
	} = useAdminComments({ page: currentPage, limit: 12, search: debouncedSearchTerm || undefined });

	const openDeleteDialog = (comment: AdminCommentItem) => {
		setCommentToDelete(comment);
		setDeleteDialogOpen(true);
	};

	const closeDeleteDialog = () => {
		setDeleteDialogOpen(false);
		setCommentToDelete(null);
	};

	const confirmDelete = async () => {
		if (!commentToDelete) return;
		await deleteComment(commentToDelete.id);
		closeDeleteDialog();
	};

	const { isInitialLoad } = useNavigation();
	if (isInitialLoad && isLoading) return <LoadingSkeleton />;

	return (
		<Container useGlobalWidth>

			{/* Page Header */}
			<div className="mb-8">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="w-11 h-11 rounded-xl bg-linear-to-br from-sky-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/25 dark:shadow-sky-500/15">
							<MessageSquare className="w-5 h-5 text-white" />
						</div>
						<div>
							<h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
								{t("TITLE")}
							</h1>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
								<span>{t("SUBTITLE")}</span>
								{!isLoading && totalComments > 0 && (
									<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400 ring-1 ring-inset ring-gray-200 dark:ring-white/10 tabular-nums">
										{totalComments}
									</span>
								)}
							</p>
						</div>
					</div>
				</div>
				<div className="mt-5 h-px bg-linear-to-r from-gray-200 via-gray-100 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent" />
			</div>

			{/* Filters */}
			<div className="mb-6 space-y-3">
				<AdminSearchBar
					value={searchTerm}
					onChange={setSearchTerm}
					isSearching={isSearching || isFetching}
					placeholder={t("SEARCH_PLACEHOLDER")}
				/>
				{hasActiveSearch && (
					<AdminActiveFilters
						filters={[{ id: "search", type: "search", label: t("SEARCH"), value: searchTerm.trim() }]}
						onRemove={() => setSearchTerm("")}
						onClearAll={clearAllFilters}
						clearAllThreshold={1}
					/>
				)}
				{!isLoading && (
					<p className="text-sm text-gray-500 dark:text-gray-400">
						{t("SHOWING_COMMENTS", { count: comments.length, total: totalComments })}
						{hasActiveFilters && <span className="ml-1">{t("FILTERED")}</span>}
					</p>
				)}
			</div>

			{/* Comments grid */}
			{comments.length === 0 ? (
				<div className={cn(CARD, "overflow-hidden")}>
					<div className="flex flex-col items-center justify-center px-6 py-20 text-center">
						<div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/6 flex items-center justify-center mb-4 ring-1 ring-gray-200 dark:ring-white/8">
							<MessageSquare className="w-6 h-6 text-gray-400 dark:text-gray-500" />
						</div>
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">{t("NO_COMMENTS_FOUND")}</h3>
						<p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
							{hasActiveFilters ? t("NO_COMMENTS_SEARCH_DESCRIPTION") : t("NO_COMMENTS_DESCRIPTION")}
						</p>
					</div>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{comments.map((comment) => (
						<CommentCard
							key={comment.id}
							comment={comment}
							isDeleting={isDeleting === comment.id}
							onPreview={setPreviewComment}
							onDelete={openDeleteDialog}
							unknownUser={t("UNKNOWN_USER")}
						/>
					))}
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex flex-col items-center mt-8 gap-3">
					<p className="text-sm text-gray-500 dark:text-gray-400">
						{t("SHOWING_RANGE", {
							start: (currentPage - 1) * 12 + 1,
							end: Math.min(currentPage * 12, totalComments),
							total: totalComments,
						})}
					</p>
					<UniversalPagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
				</div>
			)}

			{/* Full comment preview popup */}
			<CommentPreviewPopup
				comment={previewComment}
				onClose={() => setPreviewComment(null)}
				onDelete={openDeleteDialog}
				isDeleting={previewComment ? isDeleting === previewComment.id : false}
				unknownUser={t("UNKNOWN_USER")}
				unknownDate={t("UNKNOWN_DATE")}
				deleteLabel={t("DELETE")}
			/>

			{/* Delete dialog */}
			{commentToDelete && (
				<DeleteCommentDialog
					comment={commentToDelete}
					open={deleteDialogOpen}
					onOpenChange={setDeleteDialogOpen}
					onConfirm={confirmDelete}
				/>
			)}
		</Container>
	);
}
