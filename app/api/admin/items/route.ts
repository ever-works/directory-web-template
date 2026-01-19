import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ItemRepository } from '@/lib/repositories/item.repository';
import { CreateItemRequest, SortField, SortOrder } from '@/lib/types/item';
import { validatePaginationParams } from '@/lib/utils/pagination-validation';
import { getLocationEnabled } from '@/lib/utils/settings';
import { getLocationIndexService } from '@/lib/services/location';

const itemRepository = new ItemRepository();

/**
 * @swagger
 * /api/admin/items:
 *   get:
 *     tags: ["Admin - Items"]
 *     summary: "Get paginated items list"
 *     description: "Returns a paginated list of items with optional filtering by status, category, and tags. Supports comprehensive filtering and search capabilities for admin management. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "page"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: "Page number for pagination"
 *         example: 1
 *       - name: "limit"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: "Number of items per page"
 *         example: 10
 *       - name: "status"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["draft", "pending", "approved", "rejected"]
 *         description: "Filter by item status"
 *         example: "approved"
 *       - name: "category"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *         description: "Filter by category"
 *         example: "productivity"
 *       - name: "tag"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *         description: "Filter by tag"
 *         example: "saas"
 *       - name: "sortBy"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["name", "updated_at", "status", "submitted_at"]
 *           default: "updated_at"
 *         description: "Field to sort by"
 *         example: "updated_at"
 *       - name: "sortOrder"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["asc", "desc"]
 *           default: "desc"
 *         description: "Sort order direction"
 *         example: "desc"
 *     responses:
 *       200:
 *         description: "Items list retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Item"
 *                 total:
 *                   type: integer
 *                   description: "Total number of items"
 *                   example: 156
 *                 page:
 *                   type: integer
 *                   description: "Current page number"
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   description: "Number of items per page"
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   description: "Total number of pages"
 *                   example: 16
 *               required: ["success", "items", "total", "page", "limit", "totalPages"]
 *             example:
 *               success: true
 *               items:
 *                 - id: "item_123abc"
 *                   name: "Awesome Productivity Tool"
 *                   slug: "awesome-productivity-tool"
 *                   description: "A powerful tool to boost your productivity"
 *                   source_url: "https://example.com/tool"
 *                   category: ["productivity", "business"]
 *                   tags: ["saas", "productivity", "collaboration"]
 *                   featured: true
 *                   icon_url: "https://example.com/icon.png"
 *                   status: "approved"
 *                   created_at: "2024-01-20T10:30:00.000Z"
 *                   updated_at: "2024-01-20T14:45:00.000Z"
 *                 - id: "item_456def"
 *                   name: "Great Design Tool"
 *                   slug: "great-design-tool"
 *                   description: "Professional design tool for creators"
 *                   source_url: "https://example.com/design"
 *                   category: ["design", "creative"]
 *                   tags: ["design", "graphics", "creative"]
 *                   featured: false
 *                   icon_url: "https://example.com/design-icon.png"
 *                   status: "pending"
 *                   created_at: "2024-01-19T15:20:00.000Z"
 *                   updated_at: "2024-01-19T15:20:00.000Z"
 *               total: 156
 *               page: 1
 *               limit: 10
 *               totalPages: 16
 *       400:
 *         description: "Bad request - Invalid pagination parameters"
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
 *             examples:
 *               invalid_page:
 *                 value:
 *                   success: false
 *                   error: "Invalid page parameter. Must be a positive integer."
 *               invalid_limit:
 *                 value:
 *                   success: false
 *                   error: "Invalid limit parameter. Must be between 1 and 100."
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
 *                   example: "Failed to fetch items"
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);

    // Validate pagination parameters
    const paginationResult = validatePaginationParams(searchParams);
    if ('error' in paginationResult) {
      return NextResponse.json(
        { success: false, error: paginationResult.error },
        { status: paginationResult.status }
      );
    }
    const { page, limit } = paginationResult;

    const statusParam = searchParams.get('status');
    const sortByParam = searchParams.get('sortBy');
    const sortOrderParam = searchParams.get('sortOrder');

    // Trim whitespace-only search strings to undefined
    const searchRaw = searchParams.get('search');
    const search = searchRaw?.trim() ? searchRaw.trim() : undefined;

    // Helper to parse CSV params and normalize empty arrays to undefined
    const parseCsv = (value: string | null): string[] | undefined => {
      if (!value) return undefined;
      const arr = value.split(',').map(v => v.trim()).filter(Boolean);
      return arr.length ? arr : undefined;
    };

    const categories = parseCsv(searchParams.get('categories'));
    const tags = parseCsv(searchParams.get('tags'));

    // Validate status parameter with type-safe guard
    const validStatuses = ['draft', 'pending', 'approved', 'rejected'] as const;
    type ItemStatus = (typeof validStatuses)[number];
    const isItemStatus = (s: string): s is ItemStatus =>
      (validStatuses as readonly string[]).includes(s);
    let status: ItemStatus | undefined = undefined;
    if (statusParam) {
      if (!isItemStatus(statusParam)) {
        return NextResponse.json(
          { success: false, error: `Invalid status parameter. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      status = statusParam;
    }

    // Validate sortBy parameter with type-safe guard
    const validSortFields: readonly SortField[] = ['name', 'updated_at', 'status', 'submitted_at'];
    const isSortField = (s: string): s is SortField =>
      (validSortFields as readonly string[]).includes(s);
    let sortBy: SortField | undefined = undefined;
    if (sortByParam) {
      if (!isSortField(sortByParam)) {
        return NextResponse.json(
          { success: false, error: `Invalid sortBy parameter. Must be one of: ${validSortFields.join(', ')}` },
          { status: 400 }
        );
      }
      sortBy = sortByParam;
    }

    // Validate sortOrder parameter with type-safe guard
    const validSortOrders: readonly SortOrder[] = ['asc', 'desc'];
    const isSortOrder = (s: string): s is SortOrder =>
      (validSortOrders as readonly string[]).includes(s);
    let sortOrder: SortOrder | undefined = undefined;
    if (sortOrderParam) {
      if (!isSortOrder(sortOrderParam)) {
        return NextResponse.json(
          { success: false, error: `Invalid sortOrder parameter. Must be one of: ${validSortOrders.join(', ')}` },
          { status: 400 }
        );
      }
      sortOrder = sortOrderParam;
    }

    // Get paginated items
    const result = await itemRepository.findAllPaginated(page, limit, {
      status,
      search,
      categories,
      tags,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({
      success: true,
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });

  } catch (error) {
    console.error('Failed to fetch items:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch items' 
      },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/admin/items:
 *   post:
 *     tags: ["Admin - Items"]
 *     summary: "Create new item"
 *     description: "Creates a new item with comprehensive validation including duplicate checks for ID and slug. Supports all item properties including categories, tags, featured status, and initial status. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: "Unique item identifier"
 *                 example: "item_123abc"
 *               name:
 *                 type: string
 *                 description: "Item name"
 *                 example: "Awesome Productivity Tool"
 *               slug:
 *                 type: string
 *                 description: "URL-friendly slug (must be unique)"
 *                 example: "awesome-productivity-tool"
 *               description:
 *                 type: string
 *                 description: "Item description"
 *                 example: "A powerful tool to boost your productivity"
 *               source_url:
 *                 type: string
 *                 format: uri
 *                 description: "Source URL of the item"
 *                 example: "https://example.com/tool"
 *               category:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "Item categories"
 *                 example: ["productivity", "business"]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "Item tags"
 *                 example: ["saas", "productivity", "collaboration"]
 *               brand:
 *                 type: string
 *                 description: "Brand or company name associated with this item (used for CRM sync)"
 *                 example: "Acme Corporation"
 *               featured:
 *                 type: boolean
 *                 description: "Whether the item is featured"
 *                 default: false
 *                 example: true
 *               icon_url:
 *                 type: string
 *                 format: uri
 *                 description: "URL to the item's icon"
 *                 example: "https://example.com/icon.png"
 *               status:
 *                 type: string
 *                 enum: ["draft", "pending", "approved", "rejected"]
 *                 description: "Initial item status"
 *                 default: "draft"
 *                 example: "draft"
 *             required: ["id", "name", "slug", "description", "source_url"]
 *     responses:
 *       201:
 *         description: "Item created successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 item:
 *                   $ref: "#/components/schemas/Item"
 *                 message:
 *                   type: string
 *                   description: "Success message"
 *                   example: "Item created successfully"
 *               required: ["success", "item", "message"]
 *             example:
 *               success: true
 *               item:
 *                 id: "item_123abc"
 *                 name: "Awesome Productivity Tool"
 *                 slug: "awesome-productivity-tool"
 *                 description: "A powerful tool to boost your productivity"
 *                 source_url: "https://example.com/tool"
 *                 category: ["productivity", "business"]
 *                 tags: ["saas", "productivity", "collaboration"]
 *                 featured: true
 *                 icon_url: "https://example.com/icon.png"
 *                 status: "draft"
 *                 created_at: "2024-01-20T10:30:00.000Z"
 *                 updated_at: "2024-01-20T10:30:00.000Z"
 *               message: "Item created successfully"
 *       400:
 *         description: "Bad request - Invalid input or missing required fields"
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
 *                   example: "Item ID, name, slug, description, and source URL are required"
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
 *       409:
 *         description: "Conflict - Duplicate ID or slug"
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
 *                   examples:
 *                     duplicate_id: "Item with ID 'item_123abc' already exists"
 *                     duplicate_slug: "Item with slug 'awesome-tool' already exists"
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
 *                   example: "Failed to create item"
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      id,
      name,
      slug,
      description,
      source_url,
      category,
      tags,
      brand,
      featured,
      icon_url,
      status
    }: CreateItemRequest = body;

    // Validate required fields
    if (!id || !name || !slug || !description || !source_url) {
      return NextResponse.json(
        { success: false, error: "Item ID, name, slug, description, and source URL are required" },
        { status: 400 }
      );
    }

    // Check for duplicate ID
    const isDuplicateId = await itemRepository.checkDuplicateId(id);
    if (isDuplicateId) {
      return NextResponse.json(
        { success: false, error: `Item with ID '${id}' already exists` },
        { status: 409 }
      );
    }

    // Check for duplicate slug
    const isDuplicateSlug = await itemRepository.checkDuplicateSlug(slug);
    if (isDuplicateSlug) {
      return NextResponse.json(
        { success: false, error: `Item with slug '${slug}' already exists` },
        { status: 409 }
      );
    }

    // Create item with audit logging
    const auditUser = session.user.id
      ? { id: session.user.id, name: session.user.name ?? session.user.email ?? undefined }
      : undefined;

    const item = await itemRepository.create({
      id,
      name,
      slug,
      description,
      source_url,
      category: category || [],
      tags: tags || [],
      featured: featured || false,
      icon_url,
      status: status || 'draft',
      submitted_by: session.user.id,
    }, auditUser);

    // Direct CRM sync: blocks response but with retry/timeout (non-blocking for DB)
    const crmEnabled = process.env.TWENTY_CRM_ENABLED === 'true';
    if (crmEnabled) {
      try {
        // 1. Check if brand field is provided
        const brandName = brand?.trim();
        if (!brandName) {
          console.info('[CRM Sync] Skipping company creation - no brand provided', {
            action: 'company_sync',
            status: 'skipped',
            reason: 'no_brand',
            itemSlug: item.slug,
          });
        } else {
        // 2. Get or create company from brand using service layer
        const { getOrCreateCompanyFromBrand } = await import('@/lib/services/company.service');
        const { linkItemToCompany } = await import('@/lib/db/queries/company.queries');

        const company = await getOrCreateCompanyFromBrand(brandName, item.source_url);

        // 3. Link item to company and check if sync needed
        const linkResult = await linkItemToCompany(item.slug, company.id);

        // Only sync if item was newly linked or relinked to different company
        if (linkResult.created || linkResult.updated) {
          // 4. Sync company to CRM
          const { createTwentyCrmSyncServiceFromEnv } = await import(
            '@/lib/services/twenty-crm-sync-factory'
          );
          const { mapCompanyToTwentyCompany } = await import(
            '@/lib/mappers/twenty-crm.mapper'
          );

          const cacheTtlMs = parseInt(process.env.TWENTY_CRM_CACHE_TTL_MS || '300000', 10);
          const syncService = createTwentyCrmSyncServiceFromEnv(cacheTtlMs);
          const companyPayload = mapCompanyToTwentyCompany(company);
          await syncService.upsertCompany(companyPayload);

          console.info('[CRM Sync] Company synced successfully', {
            action: 'company_sync',
            status: 'success',
            companyId: company.id,
            companyName: company.name,
            itemSlug: item.slug,
            brand: brandName,
            linkCreated: linkResult.created,
            linkUpdated: linkResult.updated,
          });
        } else {
          console.info('[CRM Sync] Skipping company sync - link unchanged', {
            action: 'company_sync',
            status: 'skipped',
            reason: 'link_unchanged',
            companyId: company.id,
            itemSlug: item.slug,
          });
        }
        }
      } catch (error) {
        // Non-blocking: log error but don't fail item creation
        console.error('[CRM Sync] Company sync failed', {
          action: 'company_sync',
          status: 'error',
          itemSlug: item.slug,
          brand: brand?.trim(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Location Index: Index item location data (non-blocking)
    if (getLocationEnabled()) {
      try {
        const locationIndexService = getLocationIndexService();
        if (item.location) {
          await locationIndexService.indexItem(item);
          console.info('[Location Index] Item indexed', {
            action: 'index_item',
            status: 'success',
            slug: item.slug,
          });
        }
      } catch (error) {
        console.error('[Location Index] Failed to index item', {
          action: 'index_item',
          status: 'error',
          slug: item.slug,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      item,
      message: "Item created successfully",
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create item:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create item' 
      },
      { status: 500 }
    );
  }
} 