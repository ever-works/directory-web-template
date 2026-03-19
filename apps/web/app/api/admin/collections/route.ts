import { NextRequest, NextResponse } from 'next/server';
import { collectionRepository } from '@/lib/repositories/collection.repository';
import { CreateCollectionRequest, CollectionListOptions } from '@/types/collection';
import { auth } from '@/lib/auth';
import { invalidateContentCaches } from '@/lib/cache-invalidation';
import { revalidatePath } from 'next/cache';
import { safeErrorResponse } from '@/lib/utils/api-error';

/**
 * @swagger
 * /api/admin/collections:
 *   get:
 *     summary: List all collections
 *     description: Retrieves a paginated list of collections with optional filtering and sorting. Admin access required.
 *     tags:
 *       - Admin - Collections
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 20
 *         description: Number of items per page (up to 1000 for collections)
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inactive collections in results
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter collections by name or description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, item_count, created_at]
 *           default: name
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order direction
 *     responses:
 *       200:
 *         description: Collections retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 collections:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       slug:
 *                         type: string
 *                       description:
 *                         type: string
 *                       icon_url:
 *                         type: string
 *                       isActive:
 *                         type: boolean
 *                       item_count:
 *                         type: integer
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *                   description: Total number of collections
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                 limit:
 *                   type: integer
 *                   description: Items per page
 *                 totalPages:
 *                   type: integer
 *                   description: Total number of pages
 *       401:
 *         description: Unauthorized - Admin access required
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
 *                   example: Unauthorized. Admin access required.
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
	try {
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json(
				{ success: false, error: 'Unauthorized. Admin access required.' },
				{ status: 401 }
			);
		}

		const { searchParams } = new URL(request.url);

		// Collections can have a higher limit since they're loaded from Git and typically not numerous
		const pageParam = searchParams.get('page');
		const limitParam = searchParams.get('limit');

		const page = pageParam ? parseInt(pageParam, 10) : 1;
		const limit = limitParam ? parseInt(limitParam, 10) : 20;

		// Validate page parameter
		if (isNaN(page) || page < 1) {
			return NextResponse.json(
				{ success: false, error: 'Invalid page parameter. Must be a positive integer.' },
				{ status: 400 }
			);
		}

		// Validate limit parameter - allow up to 1000 for collections
		if (isNaN(limit) || limit < 1 || limit > 1000) {
			return NextResponse.json(
				{ success: false, error: 'Invalid limit parameter. Must be between 1 and 1000.' },
				{ status: 400 }
			);
		}
		const includeInactive = searchParams.get('includeInactive') === 'true';
		const search = searchParams.get('search') || undefined;
		const sortByParam = searchParams.get('sortBy');
		const sortBy = sortByParam === 'item_count' || sortByParam === 'created_at' ? sortByParam : 'name';
		const sortOrderParam = searchParams.get('sortOrder');
		const sortOrder = sortOrderParam === 'desc' ? 'desc' : 'asc';

		const options: CollectionListOptions = {
			includeInactive,
			search,
			sortBy,
			sortOrder,
			page,
			limit
		};

		const result = await collectionRepository.findAllPaginated(options);

		return NextResponse.json({
			success: true,
			collections: result.collections,
			total: result.total,
			page: result.page,
			limit: result.limit,
			totalPages: result.totalPages
		});
	} catch (error) {
		return safeErrorResponse(error, 'Failed to fetch collections');
	}
}

/**
 * @swagger
 * /api/admin/collections:
 *   post:
 *     summary: Create a new collection
 *     description: Creates a new collection with the provided details. Admin access required.
 *     tags:
 *       - Admin - Collections
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - name
 *             properties:
 *               id:
 *                 type: string
 *                 description: Unique identifier for the collection
 *                 example: productivity-tools
 *               name:
 *                 type: string
 *                 description: Display name of the collection
 *                 example: Productivity Tools
 *               slug:
 *                 type: string
 *                 description: URL-friendly slug (auto-generated from name if not provided)
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
 *                 default: true
 *     responses:
 *       201:
 *         description: Collection created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 collection:
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
 *                   example: Collection created successfully
 *       400:
 *         description: Bad request - Missing required fields or validation error
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
 *                   example: Collection ID and name are required
 *       401:
 *         description: Unauthorized - Admin access required
 *       409:
 *         description: Conflict - Collection with ID or slug already exists
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
	try {
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json(
				{ success: false, error: 'Unauthorized. Admin access required.' },
				{ status: 401 }
			);
		}

		let body: any;
		try {
			body = await request.json();
		} catch (jsonError) {
			console.error('Invalid JSON in request body:', jsonError);
			return NextResponse.json({ success: false, error: 'Invalid JSON in request body' }, { status: 400 });
		}

		const createData: CreateCollectionRequest = {
			id: body.id,
			name: body.name,
			slug: body.slug,
			description: body.description,
			icon_url: body.icon_url,
			isActive: body.isActive
		};

		if (!createData.id || !createData.name) {
			return NextResponse.json({ success: false, error: 'Collection ID and name are required' }, { status: 400 });
		}

		const newCollection = await collectionRepository.create(createData);
		await invalidateContentCaches();
		// Revalidate public collection pages
		revalidatePath('/collections');
		revalidatePath(`/collections/${newCollection.slug}`);

		return NextResponse.json(
			{ success: true, collection: newCollection, message: 'Collection created successfully' },
			{ status: 201 }
		);
	} catch (error) {
		console.error('Failed to create collection:', error);

		if (error instanceof Error && error.message.includes('already exists')) {
			return NextResponse.json({ success: false, error: error.message }, { status: 409 });
		}

		if (error instanceof Error && error.message.includes('must')) {
			return NextResponse.json({ success: false, error: error.message }, { status: 400 });
		}

		return safeErrorResponse(error, 'Failed to create collection');
	}
}
