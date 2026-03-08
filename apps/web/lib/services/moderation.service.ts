import {
	createModerationHistory,
	incrementWarningCount,
	suspendUser as suspendUserQuery,
	banUser as banUserQuery,
	getClientProfileById
} from '@/lib/db/queries/moderation.queries';
import { deleteComment, getCommentById } from '@/lib/db/queries/comment.queries';
import { ItemRepository } from '@/lib/repositories/item.repository';
import {
	ModerationAction,
	ReportContentType,
	type ReportContentTypeValues
} from '@/lib/db/schema';
import { EmailNotificationService } from '@/lib/services/email-notification.service';

// ===================== Types =====================

export interface ModerationResult {
	success: boolean;
	message: string;
	error?: string;
}

export interface ContentOwnerResult {
	success: boolean;
	userId?: string;
	error?: string;
}

// ===================== Helper Functions =====================

/**
 * Get the owner (author) of reported content
 * @param contentType - Type of content (item or comment)
 * @param contentId - ID of the content
 * @returns Content owner's client profile ID or error
 */
export async function getContentOwner(
	contentType: ReportContentTypeValues,
	contentId: string
): Promise<ContentOwnerResult> {
	try {
		if (contentType === ReportContentType.COMMENT) {
			const comment = await getCommentById(contentId);
			if (!comment) {
				return { success: false, error: 'Comment not found' };
			}
			return { success: true, userId: comment.userId };
		}

		if (contentType === ReportContentType.ITEM) {
			const itemRepository = new ItemRepository();
			const item = await itemRepository.findById(contentId);
			if (!item) {
				return { success: false, error: 'Item not found' };
			}
			if (!item.submitted_by) {
				return { success: false, error: 'Item has no submitter' };
			}
			return { success: true, userId: item.submitted_by };
		}

		return { success: false, error: 'Invalid content type' };
	} catch (error) {
		console.error('Error getting content owner:', error);
		return { success: false, error: 'Failed to get content owner' };
	}
}

// ===================== Moderation Actions =====================

/**
 * Remove reported content (delete comment or item)
 * @param contentType - Type of content to remove
 * @param contentId - ID of the content
 * @param reportId - Associated report ID
 * @param adminId - Admin user ID performing the action
 * @returns Result of the operation
 */
export async function removeContent(
	contentType: ReportContentTypeValues,
	contentId: string,
	reportId: string,
	adminId: string
): Promise<ModerationResult> {
	try {
		// First, get the content owner to log who was affected
		const ownerResult = await getContentOwner(contentType, contentId);
		const reason = 'Content removed due to report violation';

		if (contentType === ReportContentType.COMMENT) {
			const comment = await getCommentById(contentId);
			if (!comment) {
				return { success: false, message: 'Comment not found', error: 'NOT_FOUND' };
			}

			// Soft delete the comment
			await deleteComment(contentId);

			// Log moderation action and send email
			if (ownerResult.userId) {
				await createModerationHistory({
					userId: ownerResult.userId,
					action: ModerationAction.CONTENT_REMOVED,
					reason,
					reportId,
					performedBy: adminId,
					contentType,
					contentId
				});

				// Get user email and send notification
				const user = await getClientProfileById(ownerResult.userId);
				if (user) {
					EmailNotificationService.sendContentRemovedEmail(
						user.email,
						'comment',
						reason
					).catch((err) => console.error('Failed to send content removed email:', err));
				}
			}

			return { success: true, message: 'Comment removed successfully' };
		}

		if (contentType === ReportContentType.ITEM) {
			const itemRepository = new ItemRepository();
			const item = await itemRepository.findById(contentId);
			if (!item) {
				return { success: false, message: 'Item not found', error: 'NOT_FOUND' };
			}

			// Delete the item from Git repository
			await itemRepository.delete(contentId);

			// Log moderation action and send email
			if (ownerResult.userId) {
				await createModerationHistory({
					userId: ownerResult.userId,
					action: ModerationAction.CONTENT_REMOVED,
					reason,
					reportId,
					performedBy: adminId,
					contentType,
					contentId,
					details: { itemName: item.name, itemSlug: item.slug }
				});

				// Get user email and send notification
				const user = await getClientProfileById(ownerResult.userId);
				if (user) {
					EmailNotificationService.sendContentRemovedEmail(
						user.email,
						'item',
						reason
					).catch((err) => console.error('Failed to send content removed email:', err));
				}
			}

			return { success: true, message: 'Item removed successfully' };
		}

		return { success: false, message: 'Invalid content type', error: 'INVALID_TYPE' };
	} catch (error) {
		console.error('Error removing content:', error);
		return {
			success: false,
			message: 'Failed to remove content',
			error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
		};
	}
}

/**
 * Warn a user
 * @param userId - Client profile ID of the user to warn
 * @param reason - Reason for the warning
 * @param reportId - Associated report ID
 * @param adminId - Admin user ID performing the action
 * @returns Result of the operation
 */
export async function warnUser(
	userId: string,
	reason: string,
	reportId: string,
	adminId: string
): Promise<ModerationResult> {
	try {
		// Check if user exists
		const user = await getClientProfileById(userId);
		if (!user) {
			return { success: false, message: 'User not found', error: 'NOT_FOUND' };
		}

		// Check if user is already banned
		if (user.status === 'banned') {
			return { success: false, message: 'User is already banned', error: 'ALREADY_BANNED' };
		}

		// Increment warning count
		const updatedUser = await incrementWarningCount(userId);

		// Log moderation action
		await createModerationHistory({
			userId,
			action: ModerationAction.WARN,
			reason,
			reportId,
			performedBy: adminId,
			details: { warningCount: updatedUser.warningCount }
		});

		// Send email notification (non-blocking)
		EmailNotificationService.sendUserWarningEmail(
			user.email,
			reason,
			updatedUser.warningCount ?? 1
		).catch((err) => console.error('Failed to send warning email:', err));

		return {
			success: true,
			message: `User warned successfully. Total warnings: ${updatedUser.warningCount}`
		};
	} catch (error) {
		console.error('Error warning user:', error);
		return {
			success: false,
			message: 'Failed to warn user',
			error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
		};
	}
}

/**
 * Suspend a user
 * @param userId - Client profile ID of the user to suspend
 * @param reason - Reason for the suspension
 * @param reportId - Associated report ID
 * @param adminId - Admin user ID performing the action
 * @returns Result of the operation
 */
export async function suspendUser(
	userId: string,
	reason: string,
	reportId: string,
	adminId: string
): Promise<ModerationResult> {
	try {
		// Check if user exists
		const user = await getClientProfileById(userId);
		if (!user) {
			return { success: false, message: 'User not found', error: 'NOT_FOUND' };
		}

		// Check if user is already suspended or banned
		if (user.status === 'suspended') {
			return { success: false, message: 'User is already suspended', error: 'ALREADY_SUSPENDED' };
		}
		if (user.status === 'banned') {
			return { success: false, message: 'User is already banned', error: 'ALREADY_BANNED' };
		}

		// Suspend the user
		await suspendUserQuery(userId);

		// Log moderation action
		await createModerationHistory({
			userId,
			action: ModerationAction.SUSPEND,
			reason,
			reportId,
			performedBy: adminId
		});

		// Send email notification (non-blocking)
		EmailNotificationService.sendUserSuspensionEmail(
			user.email,
			reason
		).catch((err) => console.error('Failed to send suspension email:', err));

		return { success: true, message: 'User suspended successfully' };
	} catch (error) {
		console.error('Error suspending user:', error);
		return {
			success: false,
			message: 'Failed to suspend user',
			error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
		};
	}
}

/**
 * Ban a user
 * @param userId - Client profile ID of the user to ban
 * @param reason - Reason for the ban
 * @param reportId - Associated report ID
 * @param adminId - Admin user ID performing the action
 * @returns Result of the operation
 */
export async function banUser(
	userId: string,
	reason: string,
	reportId: string,
	adminId: string
): Promise<ModerationResult> {
	try {
		// Check if user exists
		const user = await getClientProfileById(userId);
		if (!user) {
			return { success: false, message: 'User not found', error: 'NOT_FOUND' };
		}

		// Check if user is already banned
		if (user.status === 'banned') {
			return { success: false, message: 'User is already banned', error: 'ALREADY_BANNED' };
		}

		// Ban the user
		await banUserQuery(userId);

		// Log moderation action
		await createModerationHistory({
			userId,
			action: ModerationAction.BAN,
			reason,
			reportId,
			performedBy: adminId
		});

		// Send email notification (non-blocking)
		EmailNotificationService.sendUserBanEmail(
			user.email,
			reason
		).catch((err) => console.error('Failed to send ban email:', err));

		return { success: true, message: 'User banned successfully' };
	} catch (error) {
		console.error('Error banning user:', error);
		return {
			success: false,
			message: 'Failed to ban user',
			error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
		};
	}
}
