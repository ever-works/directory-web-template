import { NextRequest, NextResponse } from 'next/server';
import { collectionRepository } from '@/lib/repositories/collection.repository';
import { auth } from '@/lib/auth';
import { AssignCollectionItemsRequest } from '@/types/collection';
import { invalidateContentCaches } from '@/lib/cache-invalidation';
import { revalidatePath } from 'next/cache';

interface RouteParams {
	params: Promise<{ id: string }>;
}

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
		const items = await collectionRepository.getAssignedItems(id);

		return NextResponse.json({ success: true, items });
	} catch (error) {
		console.error('Failed to fetch collection items:', error);
		return NextResponse.json(
			{ success: false, error: error instanceof Error ? error.message : 'Failed to fetch collection items' },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json(
				{ success: false, error: 'Unauthorized. Admin access required.' },
				{ status: 401 }
			);
		}

		const { id } = await params;
		const body = (await request.json()) as AssignCollectionItemsRequest;

		// itemIds here actually contains item slugs for backwards compatibility
		if (!Array.isArray(body.itemIds)) {
			return NextResponse.json({ success: false, error: 'itemIds array is required' }, { status: 400 });
		}

		if (!session.user.tenantId) {
			return NextResponse.json({ success: false, error: 'Tenant ID missing' }, { status: 400 });
		}

		const result = await collectionRepository.assignItems(id, body.itemIds, session.user.tenantId);
		await invalidateContentCaches();
		// Revalidate public collection pages
		revalidatePath('/collections');
		revalidatePath(`/collections/${result.collection.slug}`);

		return NextResponse.json({
			success: true,
			collection: result.collection,
			updatedItems: result.updatedItems,
			message: 'Collection items updated successfully'
		});
	} catch (error) {
		console.error('Failed to assign collection items:', error);
		return NextResponse.json(
			{ success: false, error: error instanceof Error ? error.message : 'Failed to assign collection items' },
			{ status: 500 }
		);
	}
}
