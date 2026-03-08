import { NextRequest, NextResponse } from 'next/server';
import {
	requireClientAuth,
	serverErrorResponse,
	notFoundResponse,
	forbiddenResponse,
	badRequestResponse,
} from '@/lib/utils/client-auth';
import { getClientItemRepository } from '@/lib/repositories/client-item.repository';
import { itemIdParamSchema } from '@/lib/validations/client-item';

interface RouteParams {
	params: Promise<{ id: string }>;
}

/**
 * @swagger
 * /api/client/items/{id}/restore:
 *   post:
 *     tags: ["Client - Items"]
 *     summary: "Restore a soft-deleted item"
 *     description: "Restores a previously deleted item owned by the authenticated user."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Item ID"
 *     responses:
 *       200:
 *         description: "Item restored successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 item:
 *                   type: object
 *                 message:
 *                   type: string
 *                   example: "Item restored successfully"
 *       400:
 *         description: "Bad request - Item is not deleted"
 *       401:
 *         description: "Unauthorized"
 *       403:
 *         description: "Forbidden - Not the owner"
 *       404:
 *         description: "Item not found"
 *       500:
 *         description: "Internal server error"
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		// Check client authentication
		const authResult = await requireClientAuth();
		if (!authResult.success) {
			return authResult.response;
		}
		const { userId } = authResult;

		const { id } = await params;
		const paramResult = itemIdParamSchema.safeParse({ id });
		if (!paramResult.success) {
			return badRequestResponse('Item ID is required');
		}

		// Get client item repository
		const clientItemRepository = getClientItemRepository();

		try {
			// Restore item (ownership check is done in repository)
			const item = await clientItemRepository.restoreForUser(paramResult.data.id, userId);

			return NextResponse.json({
				success: true,
				item,
				message: 'Item restored successfully',
			});

		} catch (error) {
			if (error instanceof Error) {
				if (error.message === 'Item not found') {
					return notFoundResponse('Item not found');
				}
				if (error.message.includes('permission')) {
					return forbiddenResponse(error.message);
				}
				if (error.message.includes('not deleted')) {
					return badRequestResponse(error.message);
				}
			}
			throw error;
		}

	} catch (error) {
		return serverErrorResponse(error, 'Failed to restore item');
	}
}
