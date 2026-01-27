import { ItemData, UpdateItemRequest, CreateItemRequest } from '@/lib/types/item';
import {
  ClientSubmissionData,
  ClientItemListResponse,
  ClientItemStats,
  ClientUpdateItemRequest,
  ClientCreateItemRequest,
  ClientItemsListParams,
} from '@/lib/types/client-item';
import { ItemRepository } from './item.repository';
import { slugify } from '@/lib/utils/slug';
import { getViewsPerItem } from '@/lib/db/queries/item-view.queries';

// ===================== Geo Types =====================

export interface ClientItemCoordinates {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface ClientGeoStats {
  total_items: number;
  items_with_location: number;
  items_remote: number;
  service_area_breakdown: { area: string; count: number }[];
  top_cities: { city: string; count: number }[];
  top_countries: { country: string; count: number }[];
}

/**
 * Repository for client-side item management operations.
 * Wraps ItemRepository with ownership validation and client-specific logic.
 */
export class ClientItemRepository {
  private itemRepository: ItemRepository;

  constructor() {
    this.itemRepository = new ItemRepository();
  }

  /**
   * Create a new item as a client
   * - Generates unique slug from name
   * - Sets status to 'pending' (requires admin review)
   * - Associates item with the submitting user
   */
  async createAsClient(
    userId: string,
    data: ClientCreateItemRequest
  ): Promise<ClientSubmissionData> {
    // Generate slug from name
    const baseSlug = slugify(data.name);

    // Guard against empty slugs (e.g., name with only special characters)
    if (!baseSlug) {
      throw new Error('Item name must produce a valid slug');
    }

    // Ensure unique slug by checking for duplicates
    let slug = baseSlug;
    let counter = 1;
    const MAX_SLUG_ATTEMPTS = 100;
    while (await this.itemRepository.checkDuplicateSlug(slug)) {
      if (counter > MAX_SLUG_ATTEMPTS) {
        throw new Error('Unable to generate unique slug after maximum attempts');
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Use slug as ID for consistency with git-based storage
    const id = slug;

    // Normalize category to array or empty array
    const category = data.category
      ? Array.isArray(data.category)
        ? data.category
        : [data.category]
      : [];

    // Create the item with pending status
    const createRequest: CreateItemRequest = {
      id,
      name: data.name,
      slug,
      description: data.description,
      source_url: data.source_url,
      category,
      tags: data.tags || [],
      icon_url: data.icon_url,
      status: 'pending', // Always pending for client submissions
      submitted_by: userId,
    };

    const item = await this.itemRepository.create(createRequest);

    return {
      ...item,
      views: 0,
      likes: 0,
    };
  }

  /**
   * Find all items for a specific user with pagination
   */
  async findByUserPaginated(
    userId: string,
    params: ClientItemsListParams = {}
  ): Promise<ClientItemListResponse> {
    const { page = 1, limit = 10, status, search, sortBy, sortOrder } = params;

    const result = await this.itemRepository.findAllPaginated(page, limit, {
      submittedBy: userId,
      status: status === 'all' ? undefined : status,
      search,
      sortBy,
      sortOrder,
      includeDeleted: false,
    });

    // Get stats for this user
    const stats = await this.getStatsByUser(userId);

    // Get view counts for items
    const itemSlugs = result.items.map(item => item.slug);
    const viewsMap = await getViewsPerItem(itemSlugs);

    // Convert items to ClientSubmissionData (add engagement metrics)
    const items: ClientSubmissionData[] = result.items.map(item => ({
      ...item,
      views: viewsMap.get(item.slug) ?? 0,
      likes: 0, // TODO: Fetch from engagement tracking system
    }));

    return {
      ...result,
      items,
      stats,
    };
  }

  /**
   * Find a single item by ID with ownership check
   */
  async findByIdForUser(
    id: string,
    userId: string,
    includeDeleted: boolean = false
  ): Promise<ClientSubmissionData | null> {
    const item = await this.itemRepository.findById(id, includeDeleted);

    if (!item) {
      return null;
    }

    // Ownership check
    if (item.submitted_by !== userId) {
      return null;
    }

    // Get view count for this item
    const viewsMap = await getViewsPerItem([item.slug]);

    return {
      ...item,
      views: viewsMap.get(item.slug) ?? 0,
      likes: 0, // TODO: Fetch from engagement tracking system
    };
  }

  /**
   * Update an item as a client (limited fields, ownership validation)
   * If item was approved, status changes to pending for re-review
   */
  async updateAsClient(
    id: string,
    userId: string,
    data: ClientUpdateItemRequest
  ): Promise<{ item: ItemData; statusChanged: boolean; previousStatus: string }> {
    // First, verify ownership
    const existingItem = await this.itemRepository.findById(id);

    if (!existingItem) {
      throw new Error('Item not found');
    }

    if (existingItem.submitted_by !== userId) {
      throw new Error('You do not have permission to edit this item');
    }

    if (existingItem.deleted_at) {
      throw new Error('Cannot edit a deleted item');
    }

    const previousStatus = existingItem.status;
    let statusChanged = false;

    // Build update request with only allowed fields
    const updateData: UpdateItemRequest = {
      id,
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.source_url !== undefined && { source_url: data.source_url }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.icon_url !== undefined && { icon_url: data.icon_url }),
    };

    // If item was approved, change status to pending for re-review
    if (previousStatus === 'approved') {
      updateData.status = 'pending';
      statusChanged = true;
    }

    const updatedItem = await this.itemRepository.update(id, updateData);

    return {
      item: updatedItem,
      statusChanged,
      previousStatus,
    };
  }

  /**
   * Soft delete an item (ownership validation)
   */
  async softDeleteForUser(id: string, userId: string): Promise<ItemData> {
    // First, verify ownership (include deleted items to show proper error message)
    const existingItem = await this.itemRepository.findById(id, true);

    if (!existingItem) {
      throw new Error('Item not found');
    }

    if (existingItem.submitted_by !== userId) {
      throw new Error('You do not have permission to delete this item');
    }

    if (existingItem.deleted_at) {
      throw new Error('Item is already deleted');
    }

    return await this.itemRepository.softDelete(id);
  }

  /**
   * Restore a soft-deleted item (ownership validation)
   */
  async restoreForUser(id: string, userId: string): Promise<ItemData> {
    // First, verify ownership (include deleted items in search)
    const existingItem = await this.itemRepository.findById(id, true);

    if (!existingItem) {
      throw new Error('Item not found');
    }

    if (existingItem.submitted_by !== userId) {
      throw new Error('You do not have permission to restore this item');
    }

    if (!existingItem.deleted_at) {
      throw new Error('Item is not deleted');
    }

    return await this.itemRepository.restore(id);
  }

  /**
   * Find all deleted items for a specific user with pagination
   */
  async findDeletedByUser(
    userId: string,
    params: ClientItemsListParams = {}
  ): Promise<ClientItemListResponse> {
    const { page = 1, limit = 10, sortBy, sortOrder } = params;

    // Fetch items for this user (including deleted) to filter properly
    // Using a reasonable max limit to prevent memory exhaustion
    const MAX_ITEMS_LIMIT = 10000;
    const allResult = await this.itemRepository.findAllPaginated(1, MAX_ITEMS_LIMIT, {
      submittedBy: userId,
      includeDeleted: true,
      sortBy: sortBy || 'updated_at',
      sortOrder: sortOrder || 'desc',
    });

    // Warn if limit is reached (indicates need for proper query-level filtering)
    if (allResult.items.length >= MAX_ITEMS_LIMIT) {
      console.warn(`[ClientItemRepository] User ${userId} has reached the deleted items query limit (${MAX_ITEMS_LIMIT}). Consider implementing deletedOnly filter at repository level.`);
    }

    // Filter to only deleted items
    const allDeletedItems = allResult.items.filter(item => item.deleted_at);

    // Apply pagination to filtered results
    const total = allDeletedItems.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedItems = allDeletedItems.slice(startIndex, startIndex + limit);

    // Get view counts for paginated items
    const itemSlugs = paginatedItems.map(item => item.slug);
    const viewsMap = await getViewsPerItem(itemSlugs);

    // Convert to ClientSubmissionData
    const items: ClientSubmissionData[] = paginatedItems.map(item => ({
      ...item,
      views: viewsMap.get(item.slug) ?? 0,
      likes: 0,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      stats: {
        total,
        pending: 0,
        approved: 0,
        rejected: 0,
        deleted: total,
      },
    };
  }

  /**
   * Get statistics for a specific user
   */
  async getStatsByUser(userId: string): Promise<ClientItemStats> {
    return await this.itemRepository.getStats({ submittedBy: userId });
  }

  /**
   * Check if user owns an item
   */
  async isOwner(id: string, userId: string): Promise<boolean> {
    const item = await this.itemRepository.findById(id, true);
    return item?.submitted_by === userId;
  }

  /**
   * Get coordinates for all items belonging to a user that have location data
   */
  async getCoordinatesByUser(userId: string): Promise<ClientItemCoordinates[]> {
    const items = await this.itemRepository.findAll({ submittedBy: userId });

    return items
      .filter((item) => item.location?.latitude != null && item.location?.longitude != null)
      .map((item) => ({
        slug: item.slug,
        name: item.name,
        latitude: item.location!.latitude!,
        longitude: item.location!.longitude!,
      }));
  }

  /**
   * Get geographic statistics for all items belonging to a user
   */
  async getGeoStatsByUser(userId: string): Promise<ClientGeoStats> {
    const items = await this.itemRepository.findAll({ submittedBy: userId });

    const totalItems = items.length;
    const itemsRemote = items.filter((item) => item.location?.is_remote).length;
    const itemsWithCoords = items.filter(
      (item) => item.location?.latitude != null && item.location?.longitude != null && !item.location?.is_remote
    ).length;
    const itemsWithLocation = itemsWithCoords + itemsRemote;

    // Service area breakdown (dynamic — works with any service_area string)
    const serviceAreaCounts: Record<string, number> = {};
    for (const item of items) {
      const area = item.location?.service_area;
      if (area) {
        serviceAreaCounts[area] = (serviceAreaCounts[area] || 0) + 1;
      }
    }
    const serviceAreaBreakdown = Object.entries(serviceAreaCounts)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top cities
    const cityCounts: Record<string, number> = {};
    for (const item of items) {
      const city = item.location?.city;
      if (city) {
        cityCounts[city] = (cityCounts[city] || 0) + 1;
      }
    }
    const topCities = Object.entries(cityCounts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top countries
    const countryCounts: Record<string, number> = {};
    for (const item of items) {
      const country = item.location?.country;
      if (country) {
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      }
    }
    const topCountries = Object.entries(countryCounts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total_items: totalItems,
      items_with_location: itemsWithLocation,
      items_remote: itemsRemote,
      service_area_breakdown: serviceAreaBreakdown,
      top_cities: topCities,
      top_countries: topCountries,
    };
  }
}

// Singleton instance
let clientItemRepositoryInstance: ClientItemRepository | null = null;

export function getClientItemRepository(): ClientItemRepository {
  if (!clientItemRepositoryInstance) {
    clientItemRepositoryInstance = new ClientItemRepository();
  }
  return clientItemRepositoryInstance;
}
