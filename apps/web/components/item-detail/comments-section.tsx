'use client';
import { useState, memo, useCallback } from 'react';
import { useComments } from '@/hooks/use-comments';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/header/avatar';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Trash2, Pencil, Check, AlertTriangle } from 'lucide-react';
import { Rating } from '@/components/ui/rating';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { CommentWithUser } from '@/lib/types/comment';
import { toast } from 'sonner';
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';
import { useLoginModal } from '@/hooks/use-login-modal';
import { useContainerWidth } from '@/components/ui/container';
import {
	Modal,
	ModalContent,
	ModalHeader,
	ModalBody,
	ModalFooter
} from '@/components/ui/modal';

// Design system class constants
const CARD_WRAPPER_CLASSES = 'bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/8 overflow-hidden';
const ICON_CONTAINER_CLASSES = 'p-1.5 bg-gray-100 dark:bg-white/8 rounded-lg flex items-center justify-center';
const SECTION_HEADER_CLASSES = 'px-6 py-4 border-b border-gray-100 dark:border-white/6 flex items-center gap-3';
// Delete confirmation dialog class constants
const DELETE_DIALOG_CLASSES = {
	headerContainer: 'flex items-center gap-3',
	alertIcon: 'w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center shadow-sm',
	headerText: 'text-xl font-semibold text-gray-900 dark:text-white',
	warningContainer: 'bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg p-4',
	warningContent: 'flex items-start gap-3',
	warningIcon: 'h-5 w-5 text-red-500 mt-0.5 shrink-0',
	warningText: 'text-sm leading-relaxed text-red-700 dark:text-red-300',
	footerContainer: 'flex gap-3 w-full',
	cancelButton: 'flex-1 h-10',
	deleteButton: 'flex-1 h-10 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200'
} as const;

// Extracted loading skeleton component with card styling
const CommentSkeleton = memo(() => (
	<div className={CARD_WRAPPER_CLASSES}>
		{/* Header Skeleton */}
		<div className={SECTION_HEADER_CLASSES}>
			<div className="w-7 h-7 bg-gray-200 dark:bg-white/8 rounded-lg animate-pulse" />
			<div className="h-4 bg-gray-200 dark:bg-white/8 rounded w-28 animate-pulse" />
		</div>

		{/* Form Skeleton */}
		<div className="px-6 py-5 border-b border-gray-100 dark:border-white/6 space-y-3">
			<div className="h-24 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
			<div className="h-9 bg-gray-200 dark:bg-white/8 rounded-lg w-24 ml-auto animate-pulse" />
		</div>

		{/* Comments List Skeleton */}
		<div className="px-6 py-4 space-y-4">
			{[1, 2, 3].map((i) => (
				<div key={i} className="flex gap-3 animate-pulse">
					<div className="w-8 h-8 bg-gray-200 dark:bg-white/8 rounded-full shrink-0" />
					<div className="flex-1 space-y-2">
						<div className="h-3 bg-gray-200 dark:bg-white/8 rounded w-1/4" />
						<div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-3/4" />
						<div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-2/3" />
					</div>
				</div>
			))}
		</div>
	</div>
));
CommentSkeleton.displayName = 'CommentSkeleton';

// AI chat-style comment form
const CommentForm = memo(
	({
		onSubmit,
		isCreating,
		userImage,
		userName
	}: {
		onSubmit: (content: string, rating: number) => Promise<void>;
		isCreating: boolean;
		userImage?: string | null;
		userName?: string | null;
	}) => {
		const [content, setContent] = useState('');
		const [rating, setRating] = useState(5);
		const [focused, setFocused] = useState(false);

		const handleSubmit = async (e: React.FormEvent) => {
			e.preventDefault();
			if (!content.trim()) return;
			await onSubmit(content, rating);
			setContent('');
			setRating(5);
			setFocused(false);
		};

		const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && content.trim()) {
				e.preventDefault();
				void handleSubmit(e as unknown as React.FormEvent);
			}
		};

		return (
			<div className="flex gap-3 items-start">
				{/* User avatar */}
				<Avatar
					src={userImage}
					alt={userName || 'You'}
					fallback={userName?.[0] || 'Y'}
					size="md"
					className="w-6 h-6 shrink-0 ring-1 ring-gray-200 dark:ring-white/10 mt-0.5"
				/>
				{/* Chat bubble input */}
				<form onSubmit={handleSubmit} className="flex-1 min-w-0">
					<div className={`relative border rounded-2xl transition-all duration-200 bg-white dark:bg-white/[0.04] ${
						focused
							? 'border-gray-300 dark:border-white/20 shadow-sm'
							: 'border-gray-200 dark:border-white/10'
					}`}>
						{focused && (
							<div className="flex items-center gap-2 px-4 pt-3 pb-1">
								<span className="text-xs text-gray-400 dark:text-gray-500">Rating:</span>
								<Rating value={rating} onChange={setRating} size="sm" />
							</div>
						)}
						<textarea
							id="comment"
							placeholder="Add a comment..."
							value={content}
							onChange={(e) => setContent(e.target.value)}
							onFocus={() => setFocused(true)}
							onKeyDown={handleKeyDown}
							className={`w-full bg-transparent resize-none focus:outline-none text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 px-4 transition-all duration-200 ${
								focused ? 'pt-2 pb-2 min-h-[80px]' : 'py-2.5 min-h-0'
							}`}
							maxLength={1000}
						/>
						{focused && (
							<div className="flex items-center justify-between px-3 pb-2.5 pt-1">
								<span className="text-[11px] text-gray-300 dark:text-gray-600 select-none">⌘↵ to post</span>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => { setFocused(false); setContent(''); }}
										className="h-7 cursort-pointer px-3 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
									>
										Cancel
									</button>
									<button
										type="submit"
										disabled={isCreating || !content.trim()}
										className="h-7 cursort-pointer px-4 rounded-full text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-40 hover:bg-gray-700 dark:hover:bg-gray-100 transition-all"
									>
										{isCreating ? (
											<div className="flex items-center gap-1.5">
												<div className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
												<span>Posting</span>
											</div>
										) : 'Post'}
									</button>
								</div>
							</div>
						)}
					</div>
				</form>
			</div>
		);
	}
);
CommentForm.displayName = 'CommentForm';

// Extracted single comment component
const Comment = memo(
	({
		comment,
		onDelete,
		onUpdate,
		currentUserId,
		isDeleting,
		isUpdating
	}: {
		comment: CommentWithUser;
		onDelete: (id: string) => Promise<void>;
		onUpdate: (id: string, content: string, rating: number) => Promise<void>;
		currentUserId?: string;
		isDeleting: boolean;
		isUpdating: boolean;
	}) => {
		const [isEditing, setIsEditing] = useState(false);
		const [editContent, setEditContent] = useState(comment.content);
		const [editRating, setEditRating] = useState(comment.rating);
		const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

		const handleDeleteConfirm = async () => {
			try {
				await onDelete(comment.id);
				setIsDeleteDialogOpen(false);
			} catch {
				// Keep dialog open on error - parent already shows toast
			}
		};

		const handleSave = async () => {
			if (!editContent.trim()) return;
			await onUpdate(comment.id, editContent, editRating);
			setIsEditing(false);
		};

		const handleCancel = () => {
			setEditContent(comment.content);
			setEditRating(comment.rating);
			setIsEditing(false);
		};

		const isOwner = currentUserId === comment.userId;
		const wasEdited = comment.editedAt !== null;
		const containerWidth = useContainerWidth();
		const isFluid = containerWidth === 'fluid';

		return (
			<div className={`${isFluid ? 'max-w-[80%]' : 'w-full'} group flex gap-3 px-6 py-3.5 hover:bg-gray-50/70 dark:hover:bg-white/[0.015] transition-colors duration-150`}>
				{/* Avatar — LinkedIn positions it top-left */}
				<Avatar
					src={comment.user.image}
					alt={comment.user.name || 'Anonymous'}
					fallback={comment.user.name?.[0] || 'A'}
					size="md"
					className="w-6 h-6 shrink-0 ring-1 ring-gray-200 dark:ring-white/10 mt-0.5 rounded-full"
				/>
				<div className="flex-1 min-w-0">
					{/* LinkedIn-style name card bubble */}
					<div className="bg-gray-50 dark:bg-white/[0.04] rounded-2xl px-4 py-3 border border-gray-100 dark:border-white/[0.06]">
						{/* Name + time row */}
						<div className="flex items-center justify-between gap-2 mb-1">
							<div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
								<span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
									{comment.user.name || 'Anonymous'}
								</span>
								<time dateTime={comment.createdAt.toString()} className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
									{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
								</time>
								{wasEdited && !isEditing && (
									<span className="text-[11px] text-gray-400 dark:text-gray-500 italic" title={`Edited ${formatDistanceToNow(new Date(comment.editedAt!), { addSuffix: true })}`}>
										· edited
									</span>
								)}
							</div>
							{!isEditing && (
								<Rating value={comment.rating} readOnly size="sm" />
							)}
						</div>

						{/* Comment content / edit form */}
						{isEditing ? (
							<div className="space-y-2.5 mt-2">
								<div className="flex items-center gap-2">
									<span className="text-xs text-gray-400">Rating:</span>
									<Rating value={editRating} onChange={setEditRating} size="sm" />
								</div>
								<textarea
									value={editContent}
									onChange={(e) => setEditContent(e.target.value)}
									autoFocus
									className="min-h-[72px] w-full bg-white dark:bg-white/5 resize-none border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-white/20 px-3 py-2.5 rounded-xl text-sm text-gray-800 dark:text-gray-200 transition-all"
									maxLength={1000}
								/>
								<div className="flex gap-2 justify-end">
									<button
										type="button"
										onClick={handleCancel}
										disabled={isUpdating}
										className="h-7 px-3 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-full"
									>
										Cancel
									</button>
									<button
										type="button"
										onClick={handleSave}
										disabled={isUpdating || !editContent.trim()}
										className="h-7 px-4 rounded-full text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-40 hover:bg-gray-700 dark:hover:bg-gray-100 transition-all flex items-center gap-1.5"
									>
										{isUpdating ? (
											<><div className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" /><span>Saving</span></>
										) : (
											<><Check className="w-3 h-3" /><span>Save</span></>
										)}
									</button>
								</div>
							</div>
						) : (
							<p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 mt-0.5">{comment.content}</p>
						)}
					</div>

					{/* LinkedIn-style action bar below the bubble */}
					{!isEditing && isOwner && (
						<div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
							<button
								onClick={() => setIsEditing(true)}
								disabled={isDeleting || isUpdating}
								className="flex items-center gap-1 h-6 px-2 text-[11px] font-medium text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-white/8 transition-all"
								aria-label="Edit comment"
							>
								<Pencil className="w-3 h-3" />
								<span>Edit</span>
							</button>
							<span className="text-gray-200 dark:text-white/10 select-none">·</span>
							<button
								onClick={() => setIsDeleteDialogOpen(true)}
								disabled={isDeleting || isUpdating}
								className="flex items-center gap-1 h-6 px-2 text-[11px] font-medium text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
								aria-label="Delete comment"
							>
								<Trash2 className="w-3 h-3" />
								<span>Delete</span>
							</button>
						</div>
					)}
				</div>

			{/* Delete Confirmation Dialog */}
			<Modal
				isOpen={isDeleteDialogOpen}
				onClose={() => setIsDeleteDialogOpen(false)}
				size="md"
				hideCloseButton={true}
				isDismissable={!isDeleting}
			>
				<ModalContent>
					<ModalHeader>
						<div className={DELETE_DIALOG_CLASSES.headerContainer}>
							<div className={DELETE_DIALOG_CLASSES.alertIcon}>
								<AlertTriangle className="h-5 w-5 text-white" />
							</div>
							<h2 className={DELETE_DIALOG_CLASSES.headerText}>Delete Comment</h2>
						</div>
					</ModalHeader>

					<ModalBody>
						<div className={DELETE_DIALOG_CLASSES.warningContainer}>
							<div className={DELETE_DIALOG_CLASSES.warningContent}>
								<AlertTriangle className={DELETE_DIALOG_CLASSES.warningIcon} />
								<p className={DELETE_DIALOG_CLASSES.warningText}>
									Are you sure you want to delete this comment? This action cannot be undone.
								</p>
							</div>
						</div>
					</ModalBody>

					<ModalFooter>
						<div className={DELETE_DIALOG_CLASSES.footerContainer}>
							<Button
								variant="outline"
								onClick={() => setIsDeleteDialogOpen(false)}
								disabled={isDeleting}
								className={DELETE_DIALOG_CLASSES.cancelButton}
							>
								Cancel
							</Button>
							<Button
								variant="destructive"
								onClick={handleDeleteConfirm}
								disabled={isDeleting}
								className={DELETE_DIALOG_CLASSES.deleteButton}
							>
								{isDeleting ? (
									<div className="flex items-center gap-2">
										<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
										<span>Deleting...</span>
									</div>
								) : (
									<>
										<Trash2 className="h-4 w-4 mr-2" />
										Delete
									</>
								)}
							</Button>
						</div>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</div>
	);
	}
);
Comment.displayName = 'Comment';

// Empty state component
const EmptyState = memo(() => (
	<div className="px-6 py-10 text-center" role="status">
		<div className="w-10 h-10 mx-auto mb-3 bg-gray-100 dark:bg-white/5 rounded-xl flex items-center justify-center">
			<MessageCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
		</div>
		<p className="text-sm text-gray-400 dark:text-gray-500">No comments yet. Be the first to share your thoughts!</p>
	</div>
));
EmptyState.displayName = 'EmptyState';

// Login prompt component for non-authenticated users — inline chat-bar style
const LoginPrompt = memo(({ onLoginClick }: { onLoginClick: () => void }) => (
	<div className="flex items-center gap-3">
		<div className="w-8 h-8 shrink-0 rounded-full bg-gray-100 dark:bg-white/8 flex items-center justify-center">
			<MessageCircle className="w-4 h-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
		</div>
		<button
			onClick={onLoginClick}
			className="flex-1 text-left px-4 py-2.5 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-sm text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.07] transition-all cursor-pointer"
		>
			Sign in to comment...
		</button>
	</div>
));
LoginPrompt.displayName = 'LoginPrompt';

interface CommentsSectionProps {
	itemId: string;
}

export function CommentsSection({ itemId }: CommentsSectionProps) {
	// All hooks must be called before any early returns
	const { features, isPending: isFeaturesPending, isSimulationActive } = useFeatureFlagsWithSimulation();
	const { comments, isPending: isCommentsPending, createComment, isCreating, updateComment, isUpdating, deleteComment, isDeleting } = useComments(itemId);
	const { user } = useCurrentUser();
	const loginModal = useLoginModal();

	// Combine loading states to prevent race conditions
	const isLoading = isFeaturesPending || isCommentsPending;

	const handleSubmit = useCallback(
		async (content: string, rating: number) => {
			try {
				await createComment({ content, itemId, rating });
				toast.success('Comment posted successfully!');
			} catch (error) {
				toast.error(error instanceof Error ? error.message : 'Failed to post comment');
			}
		},
		[createComment, itemId]
	);

	const handleDelete = useCallback(
		async (commentId: string) => {
			try {
				await deleteComment(commentId);
				toast.success('Comment deleted successfully');
			} catch (error) {
				toast.error(error instanceof Error ? error.message : 'Failed to delete comment');
			}
		},
		[deleteComment]
	);

	const handleUpdate = useCallback(
		async (commentId: string, content: string, rating: number) => {
			try {
				await updateComment({ commentId, content, rating });
				toast.success('Comment updated successfully!');
			} catch (error) {
				toast.error(error instanceof Error ? error.message : 'Failed to update comment');
			}
		},
		[updateComment]
	);

	// Show skeleton during loading (single coordinated check)
	if (isLoading) {
		return <CommentSkeleton />;
	}

	// Feature flags error handling removed - simulation mode doesn't expose error

	// Hide when feature is disabled due to simulation
	if (!isFeaturesPending && !features.comments && isSimulationActive) {
		return null;
	}

	// Hide comments section when feature is disabled (database not configured)
	if (!features.comments) {
		return null;
	}

	return (
		<div className={CARD_WRAPPER_CLASSES}>
			{/* Section Header */}
			<div className={SECTION_HEADER_CLASSES}>
				<div className={ICON_CONTAINER_CLASSES}>
					<MessageCircle className="w-4 h-4 text-gray-600 dark:text-gray-300" aria-hidden="true" />
				</div>
				<div className="flex items-baseline gap-2">
					<h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
						Comments
					</h2>
					<span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 tabular-nums">
						{comments.length}
					</span>
				</div>
			</div>

			{/* Comment Form */}
			<div className="px-5 py-4 border-b border-gray-100 dark:border-white/6">
				{user ? (
					<CommentForm
						onSubmit={handleSubmit}
						isCreating={isCreating}
						userImage={user.image}
						userName={user.name}
					/>
				) : (
					<LoginPrompt onLoginClick={() => loginModal.onOpen('Sign in to join the conversation', window.location.pathname + window.location.search)} />
				)}
			</div>

			{/* Comments List */}
			<div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
				{comments.length > 0 ? (
					comments.map((comment: CommentWithUser) => (
						<Comment
							key={comment.id}
							comment={comment}
							onDelete={handleDelete}
							onUpdate={handleUpdate}
							currentUserId={user?.id}
							isDeleting={isDeleting}
							isUpdating={isUpdating}
						/>
					))
				) : (
					user && <EmptyState />
				)}
			</div>
		</div>
	);
}
