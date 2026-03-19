import { ItemData, CreateItemRequest, UpdateItemRequest, ReviewRequest, ItemListOptions } from '@/lib/types/item';
import type { ItemExportData } from '@/lib/types/item-import-export';
import { createItemGitService, ItemGitServiceConfig, ItemGitService } from '@/lib/services/item-git.service';
import { getContentPath } from '@/lib/lib';
import { coreConfig } from '@/lib/config/config-service';
import { itemAuditService, type AuditUser } from '@/lib/services/item-audit.service';

export class ItemRepository {
  private gitService: ItemGitService | null = null;

  constructor() {}

  private async getGitService(): Promise<ItemGitService> {
    if (!this.gitService) {
      const dataRepo = coreConfig.content.dataRepository;
      const token = coreConfig.content.ghToken;

      if (!dataRepo || !token) {
        throw new Error('DATA_REPOSITORY and GH_TOKEN environment variables are required');
      }

      // Parse DATA_REPOSITORY URL to extract owner and repo
      const match = dataRepo.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        throw new Error('Invalid DATA_REPOSITORY format. Expected: https://github.com/owner/repo');
      }

      const [, owner, repo] = match;
      const config: ItemGitServiceConfig = {
        owner,
        repo,
        token,
        branch: coreConfig.content.githubBranch,
        dataDir: getContentPath(), // Use dynamic path (local: .content, Vercel: /tmp/.content)
        itemsDir: 'data',
      };

      this.gitService = await createItemGitService(config);
    }
    return this.gitService;
  }

  async findAll(options: ItemListOptions = {}): Promise<ItemData[]> {
    const gitService = await this.getGitService();
    const items = await gitService.readItems(options.includeDeleted ?? false);

    // Apply filters if provided
    let filteredItems = items;

    if (options.status) {
      filteredItems = filteredItems.filter(item => item.status === options.status);
    }

    if (options.categories && options.categories.length > 0) {
      filteredItems = filteredItems.filter(item => {
        // OR logic: item must have at least one of the selected categories
        const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
        return options.categories!.some(cat => itemCategories.includes(cat));
      });
    }

    if (options.tags && options.tags.length > 0) {
      filteredItems = filteredItems.filter(item => {
        // OR logic: item must have at least one of the selected tags
        return options.tags!.some(tag => item.tags.includes(tag));
      });
    }

    if (options.submittedBy) {
      filteredItems = filteredItems.filter(item => item.submitted_by === options.submittedBy);
    }

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filteredItems = filteredItems.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }

    return filteredItems;
  }

  /**
   * Find all items preserving extra YAML fields (brand, brand_logo_url, images, markdown).
   * Used for export operations.
   */
  async findAllRaw(includeDeleted: boolean = false): Promise<ItemExportData[]> {
    const gitService = await this.getGitService();
    return await gitService.readItemsRaw(includeDeleted);
  }

  async findAllPaginated(page: number = 1, limit: number = 10, options: ItemListOptions = {}): Promise<{
    items: ItemData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const gitService = await this.getGitService();
    return await gitService.getItemsPaginated(page, limit, {
      status: options.status,
      categories: options.categories,
      tags: options.tags,
      includeDeleted: options.includeDeleted,
      submittedBy: options.submittedBy,
      search: options.search,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
    });
  }

  async findById(id: string, includeDeleted: boolean = false): Promise<ItemData | null> {
    const gitService = await this.getGitService();
    return await gitService.findItemById(id, includeDeleted);
  }

  async findBySlug(slug: string, includeDeleted: boolean = false): Promise<ItemData | null> {
    const gitService = await this.getGitService();
    return await gitService.findItemBySlug(slug, includeDeleted);
  }

  async findManyBySlugs(slugs: string[], includeDeleted: boolean = false): Promise<ItemData[]> {
    if (!slugs.length) return [];
    const gitService = await this.getGitService();
    return await gitService.readItemsBySlugs(slugs, includeDeleted);
  }

  async create(data: CreateItemRequest, auditUser?: AuditUser): Promise<ItemData> {
    this.validateCreateData(data);

    const gitService = await this.getGitService();
    const item = await gitService.createItem(data);

    // Log creation to audit trail (best-effort)
    try {
      await itemAuditService.logCreation(item, auditUser);
    } catch (err) {
      console.warn('Audit logCreation failed:', err);
    }

    return item;
  }

  async update(id: string, data: UpdateItemRequest, auditUser?: AuditUser): Promise<ItemData> {
    this.validateUpdateData(id, data);

    const gitService = await this.getGitService();

    // Get previous state for change detection
    const previousItem = await gitService.findItemById(id, true);
    const updatedItem = await gitService.updateItem(id, data);

    // Log update to audit trail (best-effort, only if previous state was found)
    if (previousItem) {
      try {
        await itemAuditService.logUpdate(previousItem, updatedItem, auditUser);
      } catch (err) {
        console.warn('Audit logUpdate failed:', err);
      }
    } else {
      console.warn(`Audit skipped for update: previous state not found for id=${id}`);
    }

    return updatedItem;
  }

  async batchUpdate(updates: Array<{ id: string; data: UpdateItemRequest }>, auditUser?: AuditUser): Promise<ItemData[]> {
    const gitService = await this.getGitService();
    const results: ItemData[] = [];
    const auditEntries: Array<{ previous: ItemData; updated: ItemData }> = [];

    // Pre-validate all updates to avoid partial writes if a validation fails mid-loop
    for (const { id, data } of updates) {
      this.validateUpdateData(id, data);
    }

    for (const { id, data } of updates) {
      // Get previous state for audit logging
      const previousItem = await gitService.findItemById(id, true);
      const updated = await gitService.updateItemWithoutCommit(id, data);
      results.push(updated);

      // Store for audit logging after successful commit
      if (previousItem) {
        auditEntries.push({ previous: previousItem, updated });
      }
    }

    // Single commit for all updates
    await gitService.commitAndPushBatch(`Batch update ${updates.length} items for collection assignment`);

    // Log all updates to audit trail after successful commit (best-effort)
    for (const { previous, updated } of auditEntries) {
      try {
        await itemAuditService.logUpdate(previous, updated, auditUser);
      } catch (err) {
        console.warn('Audit logUpdate failed for batch item:', err);
      }
    }

    return results;
  }

  /**
   * Create multiple items without committing after each one, then commit once.
   * Used for batch import operations.
   */
  async batchCreate(
    items: Array<CreateItemRequest & { brand?: string; brand_logo_url?: string; images?: string[]; markdown?: string }>,
    commitMessage: string,
    auditUser?: AuditUser
  ): Promise<ItemData[]> {
    const gitService = await this.getGitService();
    const results: ItemData[] = [];

    for (const data of items) {
      const item = await gitService.createItemWithoutCommit(data);
      results.push(item);
    }

    await gitService.commitAndPushBatch(commitMessage);

    // Log all creations to audit trail after successful commit (best-effort)
    for (const item of results) {
      try {
        await itemAuditService.logCreation(item, auditUser);
      } catch (err) {
        console.warn('Audit logCreation failed for batch item:', err);
      }
    }

    return results;
  }

  async review(id: string, reviewData: ReviewRequest, auditUser?: AuditUser): Promise<ItemData> {
    this.validateReviewData(reviewData);

    const gitService = await this.getGitService();

    // Get previous status for audit log
    const previousItem = await gitService.findItemById(id, true);
    const previousStatus = previousItem?.status;

    const item = await gitService.reviewItem(id, reviewData);

    // Log review to audit trail (best-effort, only if previous status was found)
    if (previousStatus) {
      try {
        await itemAuditService.logReview(item, previousStatus, reviewData.review_notes, auditUser);
      } catch (err) {
        console.warn('Audit logReview failed:', err);
      }
    } else {
      console.warn(`Audit skipped for review: previous status not found for id=${id}`);
    }

    return item;
  }

  async delete(id: string, auditUser?: AuditUser): Promise<void> {
    const gitService = await this.getGitService();

    // Get item info before deletion for audit log
    const item = await gitService.findItemById(id, true);

    await gitService.deleteItem(id);

    // Log hard deletion to audit trail (best-effort)
    if (item) {
      try {
        await itemAuditService.logDeletion(item, auditUser, false);
      } catch (err) {
        console.warn('Audit logDeletion failed:', err);
      }
    }
  }

  async softDelete(id: string, auditUser?: AuditUser): Promise<ItemData> {
    const gitService = await this.getGitService();
    const item = await gitService.softDeleteItem(id);

    // Log soft deletion to audit trail (best-effort)
    try {
      await itemAuditService.logDeletion(item, auditUser, true);
    } catch (err) {
      console.warn('Audit logDeletion (soft) failed:', err);
    }

    return item;
  }

  async restore(id: string, auditUser?: AuditUser): Promise<ItemData> {
    const gitService = await this.getGitService();
    const item = await gitService.restoreItem(id);

    // Log restoration to audit trail (best-effort)
    try {
      await itemAuditService.logRestoration(item, auditUser);
    } catch (err) {
      console.warn('Audit logRestoration failed:', err);
    }

    return item;
  }

  async checkDuplicateId(id: string): Promise<boolean> {
    const gitService = await this.getGitService();
    const items = await gitService.readItems(true);
    return items.some((item: ItemData) => item.id === id);
  }

  async checkDuplicateSlug(slug: string): Promise<boolean> {
    const gitService = await this.getGitService();
    const items = await gitService.readItems(true);
    return items.some((item: ItemData) => item.slug === slug);
  }

  async getStats(options: {
    submittedBy?: string;
    search?: string;
    categories?: string[];
    tags?: string[];
  } = {}): Promise<{
    total: number;
    draft: number;
    pending: number;
    approved: number;
    rejected: number;
    deleted: number;
  }> {
    const gitService = await this.getGitService();
    // Get all items including deleted to count deleted items
    const allItems = await gitService.readItems(true);

    // Filter by submittedBy if provided
    let items = options.submittedBy
      ? allItems.filter((item: ItemData) => item.submitted_by === options.submittedBy)
      : allItems;

    // Apply category filter (OR logic)
    if (options.categories && options.categories.length > 0) {
      items = items.filter((item: ItemData) => {
        const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
        return options.categories!.some(cat => itemCategories.includes(cat));
      });
    }

    // Apply tag filter (OR logic)
    if (options.tags && options.tags.length > 0) {
      items = items.filter((item: ItemData) => {
        return options.tags!.some(tag => item.tags.includes(tag));
      });
    }

    // Apply search filter
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      items = items.filter((item: ItemData) =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }

    // Separate deleted and non-deleted items
    const deletedItems = items.filter((item: ItemData) => item.deleted_at);
    const activeItems = items.filter((item: ItemData) => !item.deleted_at);

    return {
      total: activeItems.length,
      draft: activeItems.filter((item: ItemData) => item.status === 'draft').length,
      pending: activeItems.filter((item: ItemData) => item.status === 'pending').length,
      approved: activeItems.filter((item: ItemData) => item.status === 'approved').length,
      rejected: activeItems.filter((item: ItemData) => item.status === 'rejected').length,
      deleted: deletedItems.length,
    };
  }

  private validateCreateData(data: CreateItemRequest): void {
    if (!data.id || data.id.trim().length === 0) {
      throw new Error('Item ID is required');
    }
    
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Item name is required');
    }
    
    if (!data.slug || data.slug.trim().length === 0) {
      throw new Error('Item slug is required');
    }
    
    if (!data.description || data.description.trim().length === 0) {
      throw new Error('Item description is required');
    }
    
    if (!data.source_url || data.source_url.trim().length === 0) {
      throw new Error('Item source URL is required');
    }
    
    // Validate slug format (lowercase, hyphens, no spaces)
    if (!/^[a-z0-9-]+$/.test(data.slug)) {
      throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
    }
    
    // Validate URL format
    try {
      new URL(data.source_url);
    } catch {
      throw new Error('Invalid source URL format');
    }
  }

  private validateUpdateData(id: string, data: UpdateItemRequest): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Item ID is required');
    }
    
    if (data.name !== undefined && (!data.name || data.name.trim().length === 0)) {
      throw new Error('Item name cannot be empty');
    }
    
    if (data.slug !== undefined) {
      if (!data.slug || data.slug.trim().length === 0) {
        throw new Error('Item slug cannot be empty');
      }
      
      if (!/^[a-z0-9-]+$/.test(data.slug)) {
        throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
      }
    }
    
    if (data.source_url !== undefined) {
      try {
        new URL(data.source_url);
      } catch {
        throw new Error('Invalid source URL format');
      }
    }
  }

  private validateReviewData(data: ReviewRequest): void {
    if (!data.status || !['approved', 'rejected'].includes(data.status)) {
      throw new Error('Review status must be either "approved" or "rejected"');
    }
  }
} 