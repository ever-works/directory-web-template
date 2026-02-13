'use client';
import { useState, memo, useCallback } from 'react';
import { useComments } from '@/hooks/use-comments';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/header/avatar';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Trash2, Pencil, Check, X, AlertTriangle } from 'lucide-react';
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

// Design system class constants - Clean & Modern
const CARD_WRAPPER_CLASSES = 'bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300';
const ICON_CONTAINER_CLASSES = 'p-3 bg-linear-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl';
const SECTION_HEADER_CLASSES = 'flex items-center gap-4 mb-8';
const FORM_CONTAINER_CLASSES = 'p-6 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800';

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
			<div className="w-10 h-10 bg-linear-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg animate-pulse" />
			<div className="h-7 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 animate-pulse" />
		</div>

		{/* Form Skeleton */}
		<div className="mb-8 space-y-4">
			<div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
			<div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-32 ml-auto animate-pulse" />
		</div>

		{/* Comments List Skeleton */}
		<div className="space-y-4">
			{[1, 2, 3].map((i) => (
				<div key={i} className="flex gap-4 animate-pulse">
					<div className="w-10 h-10 bg-linear-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full" />
					<div className="flex-1 space-y-2">
						<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
						<div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
						<div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
					</div>
				</div>
			))}
		</div>
	</div>
));
CommentSkeleton.displayName = 'CommentSkeleton';

// Extracted comment form component
const CommentForm = memo(
	({
		onSubmit,
		isCreating
	}: {
		onSubmit: (content: string, rating: number) => Promise<void>;
		isCreating: boolean;
	}) => {
		const [content, setContent] = useState('');
		const [rating, setRating] = useState(5);

		const handleSubmit = async (e: React.FormEvent) => {
			e.preventDefault();
			if (!content.trim()) return;

			await onSubmit(content, rating);
			setContent('');
			setRating(5);
		};

		return (
			<div className={FORM_CONTAINER_CLASSES}>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="flex items-center gap-2">
						<label htmlFor="rating" className="text-sm font-medium text-gray-600 dark:text-gray-400">
							Your rating:
						</label>
						<Rating value={rating} onChange={setRating} size="md" />
					</div>
					<textarea
						id="comment"
						placeholder="Share your thoughts..."
						value={content}
						onChange={(e) => setContent(e.target.value)}
						autoFocus
						className="min-h-[100px] bg-white dark:bg-gray-900 resize-none border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-theme-primary-500/50 focus:border-theme-primary-500 w-full px-4 py-3 rounded-lg transition-all"
						maxLength={1000}
						required
					/>
					<div className="flex justify-end">
						<Button
							type="submit"
							disabled={isCreating || !content.trim()}
							className="h-10 px-6 bg-linear-to-r from-theme-primary-500 to-theme-primary-600 hover:from-theme-primary-600 hover:to-theme-primary-700 text-white font-medium shadow-sm hover:shadow-md transition-all rounded-lg"
						>
							{isCreating ? (
								<div className="flex items-center gap-2">
									<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
									<span>Posting...</span>
								</div>
							) : (
								'Post Comment'
							)}
						</Button>
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
			<div className={` ${isFluid ? 'w-4/5' : 'full'} group flex gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all duration-200`}>
				<Avatar
					src={comment.user.image}
					alt={comment.user.name || 'Anonymous'}
					fallback={comment.user.name?.[0] || 'A'}
					size="md"
					className="w-10 h-10 ring-2 ring-gray-100 dark:ring-gray-800 shadow-sm"
				/>
				<div className="flex-1 min-w-0">
					<div className="flex items-start justify-between gap-3 mb-2">
						<div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
							<span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
								{comment.user.name || 'Anonymous'}
							</span>
							<time dateTime={comment.createdAt.toString()} className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
								{formatDistanceToNow(new Date(comment.createdAt), {
									addSuffix: true
								})}
							</time>
							{wasEdited && !isEditing && (
								<span className="text-xs text-gray-400 dark:text-gray-500 italic" title={`Edited ${formatDistanceToNow(new Date(comment.editedAt!), { addSuffix: true })}`}>
									(edited)
								</span>
							)}
						</div>
						{!isEditing && (
							<div className="flex items-center gap-2 shrink-0">
								{isOwner && (
									<>
										<Button
											variant="ghost"
											size="sm"
										className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg"
										onClick={() => setIsEditing(true)}
										disabled={isDeleting || isUpdating}
										aria-label="Edit comment"
									>
										<Pencil className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
											onClick={() => setIsDeleteDialogOpen(true)}
											disabled={isDeleting || isUpdating}
											aria-label="Delete comment"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</>
								)}
								<Rating value={comment.rating} readOnly size="sm" />
							</div>
						)}
					</div>

					{isEditing ? (
						<div className="space-y-3">
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-gray-600 dark:text-gray-400">
									Rating:
								</label>
								<Rating value={editRating} onChange={setEditRating} size="sm" />
							</div>
							<textarea
								value={editContent}
								onChange={(e) => setEditContent(e.target.value)}
								autoFocus
								className="min-h-20 bg-white dark:bg-gray-900 resize-none border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-theme-primary-500/50 focus:border-theme-primary-500 w-full px-4 py-3 rounded-lg transition-all"
								maxLength={1000}
								required
							/>
							<div className="flex gap-2 justify-end">
								<Button
									variant="ghost"
									size="sm"
									onClick={handleCancel}
									disabled={isUpdating}
									className="h-9 px-4 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
								>
									<X className="h-4 w-4 mr-2" />
									Cancel
								</Button>
								<Button
									size="sm"
									onClick={handleSave}
									disabled={isUpdating || !editContent.trim()}
									className="h-9 px-5 bg-linear-to-r from-theme-primary-500 to-theme-primary-600 hover:from-theme-primary-600 hover:to-theme-primary-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
								>
									{isUpdating ? (
										<div className="flex items-center gap-2">
											<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
											<span>Saving...</span>
										</div>
									) : (
										<>
											<Check className="h-4 w-4 mr-2" />
											Save
										</>
									)}
								</Button>
							</div>
						</div>
					) : (
						<p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{comment.content}</p>
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
	<div className="text-center py-10" role="status">
		<div className="w-14 h-14 mx-auto mb-3 bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg flex items-center justify-center">
			<MessageCircle className="w-7 h-7 text-gray-400 dark:text-gray-500" aria-hidden="true" />
		</div>
		<p className="text-gray-500 dark:text-gray-400 font-medium">No comments yet. Be the first to share your thoughts!</p>
	</div>
));
EmptyState.displayName = 'EmptyState';

// Login prompt component for non-authenticated users
const LoginPrompt = memo(({ onLoginClick }: { onLoginClick: () => void }) => (
	<div className={FORM_CONTAINER_CLASSES}>
		<div className="text-center py-8 space-y-4">
			<div className="w-12 h-12 mx-auto bg-linear-to-br from-theme-primary-500 to-theme-primary-600 rounded-lg flex items-center justify-center shadow-sm">
				<MessageCircle className="w-6 h-6 text-white" aria-hidden="true" />
			</div>
			<div className="space-y-1">
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
					Join the Conversation
				</h3>
				<p className="text-sm text-gray-600 dark:text-gray-400">
					Sign in to share your thoughts and rate this item
				</p>
			</div>
			<Button
				onClick={onLoginClick}
				className="h-10 px-6 bg-linear-to-r from-theme-primary-500 to-theme-primary-600 hover:from-theme-primary-600 hover:to-theme-primary-700 text-white font-medium shadow-sm hover:shadow-md transition-all rounded-lg"
			>
				Sign In to Comment
			</Button>
			<p className="text-xs text-gray-500 dark:text-gray-400">
				Don&apos;t have an account? Sign up when you click above
			</p>
		</div>
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
			{/* Section Header with Icon */}
			<div className={SECTION_HEADER_CLASSES}>
				   <div className={ICON_CONTAINER_CLASSES}>
					   <MessageCircle className="w-5 h-5 text-white" aria-hidden="true" />
				   </div>
				   <div>
					   <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
						   Comments
					   </h2>
					   <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
						   {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
					   </p>
				   </div>
			</div>

			{/* Comment Form */}
			<div className="mb-8">
				{user ? (
				<CommentForm onSubmit={handleSubmit} isCreating={isCreating} />
			) : (
				<LoginPrompt onLoginClick={() => loginModal.onOpen('Sign in to join the conversation', window.location.pathname + window.location.search)} />
			)}
			</div>

			{/* Comments List */}
			<div className="space-y-2">
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
