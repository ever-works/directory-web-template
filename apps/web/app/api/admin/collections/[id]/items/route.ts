import { NextRequest, NextResponse } from "next/server";
import { collectionRepository } from "@/lib/repositories/collection.repository";
import { AssignCollectionItemsRequest } from "@/types/collection";
import { invalidateContentCaches } from "@/lib/cache-invalidation";
import { revalidatePath } from "next/cache";
import { safeErrorResponse } from '@/lib/utils/api-error';
import { checkAdminAuth } from '@/lib/auth/admin-guard';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const authError = await checkAdminAuth();
    if (authError) return authError;

    const { id } = await params;
    const items = await collectionRepository.getAssignedItems(id);

    return NextResponse.json({
      success: true,
      data: items,
      // Legacy field retained for backward compatibility (see EW-606)
      items,
    });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch collection items');
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authError = await checkAdminAuth();
    if (authError) return authError;

    const { id } = await params;
    const body = (await request.json()) as AssignCollectionItemsRequest;

    // itemIds here actually contains item slugs for backwards compatibility
    if (!Array.isArray(body.itemIds)) {
      return NextResponse.json(
        { success: false, error: "itemIds array is required" },
        { status: 400 }
      );
    }

    const result = await collectionRepository.assignItems(id, body.itemIds);
    await invalidateContentCaches();
    // Revalidate public collection pages
    revalidatePath("/collections");
    revalidatePath(`/collections/${result.collection.slug}`);

    return NextResponse.json({
      success: true,
      data: { collection: result.collection, updatedItems: result.updatedItems },
      message: "Collection items updated successfully",
      // Legacy fields retained for backward compatibility (see EW-606)
      collection: result.collection,
      updatedItems: result.updatedItems,
    });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to assign collection items');
  }
}
