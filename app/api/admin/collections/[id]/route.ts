import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { collectionRepository } from '@/lib/repositories/collection.repository';
import { COLLECTION_VALIDATION, UpdateCollectionRequest } from '@/types/collection';
import { auth } from '@/lib/auth';
import { invalidateContentCaches } from '@/lib/cache-invalidation';
import { z } from 'zod';

interface RouteParams {
	params: Promise<{ id: string }>;
}

const updateCollectionSchema = z.object({
	name: z
		.string()
		.trim()
		.min(COLLECTION_VALIDATION.NAME_MIN_LENGTH)
		.max(COLLECTION_VALIDATION.NAME_MAX_LENGTH)
		.optional(),
	slug: z
		.string()
		.trim()
		.min(COLLECTION_VALIDATION.ID_MIN_LENGTH)
		.max(COLLECTION_VALIDATION.ID_MAX_LENGTH)
		.optional(),
	description: z.string().trim().max(COLLECTION_VALIDATION.DESCRIPTION_MAX_LENGTH).optional(),
	icon_url: z.string().trim().optional(),
	isActive: z.boolean().optional()
});

/**
 * @swagger
 * /api/admin/collections/{id}:
 *   get:
 *     summary: Get a single collection
 *     description: Retrieves detailed information about a specific collection by ID. Admin access required.
 *     tags:
 *       - Admin - Collections
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection ID
 *         example: productivity-tools
 *     responses:
 *       200:
 *         description: Collection retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     slug:
 *                       type: string
 *                     description:
 *                       type: string
 *                     icon_url:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *                     item_count:
 *                       type: integer
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - Admin access required
 *       404:
 *         description: Collection not found
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
 *                   example: Collection not found
 *       500:
 *         description: Server error
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
	try {
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json(
				{ success: false, error: 'Unauthorized. Admin access required.' },
				{ status: 401 }
			);
		}

		const { id } = await params;
		const collection = await collectionRepository.findById(id);

		if (!collection) {
			return NextResponse.json({ success: false, error: 'Collection not found' }, { status: 404 });
		}

		return NextResponse.json({ success: true, data: collection });
	} catch (error) {
		console.error('Failed to fetch collection:', error);
		return NextResponse.json(
			{ success: false, error: error instanceof Error ? error.message : 'Failed to fetch collection' },
			{ status: 500 }
		);
	}
}

/**
 * @swagger
 * /api/admin/collections/{id}:
 *   put:
 *     summary: Update a collection
 *     description: Updates an existing collection with the provided details. Admin access required.
 *     tags:
 *       - Admin - Collections
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection ID
 *         example: productivity-tools
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Display name of the collection
 *                 example: Productivity Tools
 *               slug:
 *                 type: string
 *                 description: URL-friendly slug
 *                 example: productivity-tools
 *               description:
 *                 type: string
 *                 description: Detailed description of the collection
 *                 example: Essential tools to boost your productivity
 *               icon_url:
 *                 type: string
 *                 description: URL to the collection icon
 *                 example: /icons/productivity.svg
 *               isActive:
 *                 type: boolean
 *                 description: Whether the collection is active and visible
 *     responses:
 *       200:
 *         description: Collection updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     slug:
 *                       type: string
 *                     description:
 *                       type: string
 *                     icon_url:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *                     item_count:
 *                       type: integer
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *                   example: Collection updated successfully
 *       400:
 *         description: Bad request - Validation error
 *       401:
 *         description: Unauthorized - Admin access required
 *       409:
 *         description: Conflict - Slug already exists
 *       500:
 *         description: Server error
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
	try {
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json(
				{ success: false, error: 'Unauthorized. Admin access required.' },
				{ status: 401 }
			);
		}

		const { id } = await params;
		const body = await request.json();
		const parsed = updateCollectionSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ success: false, error: 'Invalid collection payload', details: parsed.error.flatten() },
				{ status: 400 }
			);
		}

		const updateData: UpdateCollectionRequest = {
			id,
			...parsed.data
		};

		const beforeUpdate = await collectionRepository.findById(id);
		if (!beforeUpdate) {
			return NextResponse.json({ success: false, error: 'Collection not found' }, { status: 404 });
		}

		const updated = await collectionRepository.update(updateData);
		await invalidateContentCaches();

		// Revalidate both old and new slugs if slug changed
		if (beforeUpdate && beforeUpdate.slug !== (updateData.slug || id)) {
			revalidatePath(`/collections/${beforeUpdate.slug}`); // old slug
		}
		const targetSlug = updated.slug || updateData.slug || id;
		revalidatePath(`/collections/${targetSlug}`); // new slug
		revalidatePath(`/collections`);

		return NextResponse.json({ success: true, data: updated, message: 'Collection updated successfully' });
	} catch (error) {
		console.error('Failed to update collection:', error);

		if (error instanceof Error && error.message.includes('already exists')) {
			return NextResponse.json({ success: false, error: error.message }, { status: 409 });
		}

		if (error instanceof Error && error.message.includes('must')) {
			return NextResponse.json({ success: false, error: error.message }, { status: 400 });
		}

		return NextResponse.json(
			{ success: false, error: error instanceof Error ? error.message : 'Failed to update collection' },
			{ status: 500 }
		);
	}
}

/**
 * @swagger
 * /api/admin/collections/{id}:
 *   delete:
 *     summary: Delete a collection
 *     description: Permanently deletes a collection by ID. Admin access required.
 *     tags:
 *       - Admin - Collections
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection ID
 *         example: productivity-tools
 *     responses:
 *       200:
 *         description: Collection deleted successfully
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
 *                   example: Collection deleted successfully
 *       401:
 *         description: Unauthorized - Admin access required
 *       500:
 *         description: Server error
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
	try {
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json(
				{ success: false, error: 'Unauthorized. Admin access required.' },
				{ status: 401 }
			);
		}

		const { id } = await params;

		// Fetch collection before deleting to get its slug for proper cache invalidation
		const collection = await collectionRepository.findById(id);
		if (!collection) {
			return NextResponse.json({ success: false, error: 'Collection not found' }, { status: 404 });
		}

		if (!session.user.tenantId) {
			return NextResponse.json({ success: false, error: 'Tenant ID missing' }, { status: 400 });
		}
		await collectionRepository.delete(id, session.user.tenantId);
		await invalidateContentCaches();

		// Invalidate collection detail/list pages for removed collection using slug
		revalidatePath(`/collections/${collection.slug}`);
		revalidatePath(`/collections`);

		return NextResponse.json({ success: true, message: 'Collection deleted successfully' });
	} catch (error) {
		console.error('Failed to delete collection:', error);

		if (error instanceof Error && error.message.includes('not found')) {
			return NextResponse.json({ success: false, error: error.message }, { status: 404 });
		}

		return NextResponse.json(
			{ success: false, error: error instanceof Error ? error.message : 'Failed to delete collection' },
			{ status: 500 }
		);
	}
}
