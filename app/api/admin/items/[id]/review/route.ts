import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ItemRepository } from '@/lib/repositories/item.repository';
import { UserRepository } from '@/lib/repositories/user.repository';
import { EmailNotificationService } from '@/lib/services/email-notification.service';
import { ReviewRequest } from '@/lib/types/item';

const itemRepository = new ItemRepository();
const userRepository = new UserRepository();

/**
 * @swagger
 * /api/admin/items/{id}/review:
 *   post:
 *     tags: ["Admin - Items"]
 *     summary: "Review item (approve/reject)"
 *     description: "Reviews an item by approving or rejecting it with optional review notes. Changes the item status and records the review decision. This is typically used for moderating submitted items. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Item ID to review"
 *         example: "item_123abc"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ["approved", "rejected"]
 *                 description: "Review decision"
 *                 example: "approved"
 *               review_notes:
 *                 type: string
 *                 description: "Optional review notes explaining the decision"
 *                 example: "Great tool, meets all quality standards. Approved for listing."
 *             required: ["status"]
 *     responses:
 *       200:
 *         description: "Item reviewed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: "#/components/schemas/Item"
 *                 message:
 *                   type: string
 *                   description: "Success message"
 *                   example: "Item approved successfully"
 *               required: ["success", "data", "message"]
 *             example:
 *               success: true
 *               data:
 *                 id: "item_123abc"
 *                 name: "Awesome Productivity Tool"
 *                 slug: "awesome-productivity-tool"
 *                 description: "A powerful tool to boost your productivity"
 *                 source_url: "https://example.com/tool"
 *                 category: ["productivity", "business"]
 *                 tags: ["saas", "productivity", "collaboration"]
 *                 featured: false
 *                 icon_url: "https://example.com/icon.png"
 *                 status: "approved"
 *                 review_notes: "Great tool, meets all quality standards. Approved for listing."
 *                 created_at: "2024-01-20T10:30:00.000Z"
 *                 updated_at: "2024-01-20T16:45:00.000Z"
 *                 reviewed_at: "2024-01-20T16:45:00.000Z"
 *               message: "Item approved successfully"
 *       400:
 *         description: "Bad request - Invalid review status"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Review status must be either 'approved' or 'rejected'"
 *       401:
 *         description: "Unauthorized - Admin access required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unauthorized. Admin access required."
 *       404:
 *         description: "Item not found"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Item not found"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to review item"
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status, review_notes }: ReviewRequest = body;

    // Validate review data
    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Review status must be either 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    // Review the item with audit logging
    const resolvedParams = await params;
    const auditUser = session.user.id
      ? { id: session.user.id, name: session.user.name ?? session.user.email ?? undefined }
      : undefined;

    const item = await itemRepository.review(resolvedParams.id, {
      status,
      review_notes,
    }, auditUser);

    // Debug: Log item details for troubleshooting
    console.log('[Review] Item reviewed:', {
      id: item.id,
      name: item.name,
      status: status,
      submitted_by: item.submitted_by,
      hasSubmittedBy: !!item.submitted_by,
      isAdmin: item.submitted_by === 'admin',
      isAnonymous: item.submitted_by === 'anonymous'
    });

    // Send email notification to submitter (async, don't block response)
    if (item.submitted_by && item.submitted_by !== 'admin' && item.submitted_by !== 'anonymous') {
      console.log('[Review] Attempting to send notification to user:', item.submitted_by);
      try {
        const user = await userRepository.findById(item.submitted_by);
        console.log('[Review] User found:', {
          id: user?.id,
          hasEmail: !!user?.email
        });

        if (user?.email) {
          const emailResult = await EmailNotificationService.sendSubmissionDecisionEmail(
            user.email,
            item.name,
            status,
            review_notes
          );
          console.log('[Review] Email send result:', emailResult);
        } else {
          console.warn(`[Review] User ${item.submitted_by} not found or has no email`);
        }
      } catch (notificationError) {
        console.error('[Review] Failed to send notification email:', notificationError);
        // Don't block the review response if notification fails
      }
    } else {
      console.warn(`[Review] Skipping notification - submitted_by: "${item.submitted_by}" (admin=${item.submitted_by === 'admin'}, anonymous=${item.submitted_by === 'anonymous'}, empty=${!item.submitted_by})`);
    }

    return NextResponse.json({
      success: true,
      data: item,
      message: `Item ${status} successfully`,
    });

  } catch (error) {
    console.error('Failed to review item:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to review item' 
      },
      { status: 500 }
    );
  }
} 