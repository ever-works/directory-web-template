import { NextRequest, NextResponse } from 'next/server';
import {
  requireClientAuth,
  serverErrorResponse,
  notFoundResponse,
  forbiddenResponse,
  badRequestResponse,
} from '@/lib/utils/client-auth';
import { getClientItemRepository } from '@/lib/repositories/client-item.repository';
import { clientUpdateItemSchema, itemIdParamSchema } from '@/lib/validations/client-item';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * @swagger
 * /api/client/items/{id}:
 *   get:
 *     tags: ["Client - Items"]
 *     summary: "Get a single item"
 *     description: "Returns details of a specific item owned by the authenticated user."
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
 *         description: "Item retrieved successfully"
 *       401:
 *         description: "Unauthorized"
 *       403:
 *         description: "Forbidden - Not the owner"
 *       404:
 *         description: "Item not found"
 *       500:
 *         description: "Internal server error"
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Fetch item for user (ownership check is done in repository)
    const item = await clientItemRepository.findByIdForUser(paramResult.data.id, userId);

    if (!item) {
      return notFoundResponse('Item not found or you do not have permission to view it');
    }

    return NextResponse.json({
      success: true,
      item,
      engagement: {
        views: item.views ?? 0,
        likes: item.likes ?? 0,
      },
    });

  } catch (error) {
    return serverErrorResponse(error, 'Failed to fetch item');
  }
}

/**
 * @swagger
 * /api/client/items/{id}:
 *   put:
 *     tags: ["Client - Items"]
 *     summary: "Update an item"
 *     description: "Updates an item owned by the authenticated user. If the item was approved, its status will change to pending for re-review."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "id"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Item ID"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               source_url:
 *                 type: string
 *               category:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               icon_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: "Item updated successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 item:
 *                   type: object
 *                 statusChanged:
 *                   type: boolean
 *                   description: "True if status changed from approved to pending"
 *                 previousStatus:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: "Bad request - Invalid input"
 *       401:
 *         description: "Unauthorized"
 *       403:
 *         description: "Forbidden - Not the owner"
 *       404:
 *         description: "Item not found"
 *       500:
 *         description: "Internal server error"
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Parse and validate request body
    const body = await request.json();
    const validationResult = clientUpdateItemSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((issue) => issue.message)
        .join(', ');
      return badRequestResponse(errorMessage);
    }

    const updateData = validationResult.data;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return badRequestResponse('No fields to update');
    }

    // Get client item repository
    const clientItemRepository = getClientItemRepository();

    try {
      // Update item (ownership check is done in repository)
      const result = await clientItemRepository.updateAsClient(paramResult.data.id, userId, updateData);

      let message = 'Item updated successfully';
      if (result.statusChanged) {
        message = 'Item updated successfully. Since it was previously approved, it has been moved to pending for re-review.';
      }

      return NextResponse.json({
        success: true,
        item: result.item,
        statusChanged: result.statusChanged,
        previousStatus: result.previousStatus,
        message,
      });

    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Item not found') {
          return notFoundResponse('Item not found');
        }
        if (error.message.includes('permission')) {
          return forbiddenResponse(error.message);
        }
        if (error.message.includes('deleted')) {
          return badRequestResponse(error.message);
        }
      }
      throw error;
    }

  } catch (error) {
    return serverErrorResponse(error, 'Failed to update item');
  }
}

/**
 * @swagger
 * /api/client/items/{id}:
 *   delete:
 *     tags: ["Client - Items"]
 *     summary: "Delete an item (soft delete)"
 *     description: "Soft deletes an item owned by the authenticated user. The item will be hidden but can be restored later."
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
 *         description: "Item deleted successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Item deleted successfully"
 *       401:
 *         description: "Unauthorized"
 *       403:
 *         description: "Forbidden - Not the owner"
 *       404:
 *         description: "Item not found"
 *       500:
 *         description: "Internal server error"
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
      // Soft delete item (ownership check is done in repository)
      await clientItemRepository.softDeleteForUser(paramResult.data.id, userId);

      return NextResponse.json({
        success: true,
        message: 'Item deleted successfully',
      });

    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Item not found') {
          return notFoundResponse('Item not found');
        }
        if (error.message.includes('permission')) {
          return forbiddenResponse(error.message);
        }
        if (error.message.includes('already deleted')) {
          return badRequestResponse(error.message);
        }
      }
      throw error;
    }

  } catch (error) {
    return serverErrorResponse(error, 'Failed to delete item');
  }
}
