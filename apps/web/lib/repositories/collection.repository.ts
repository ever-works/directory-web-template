import 'server-only';
import {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  CollectionListOptions,
  COLLECTION_VALIDATION,
} from '@/types/collection';
import { createCollectionGitService, CollectionGitService } from '@/lib/services/collection-git.service';
import { ItemRepository } from './item.repository';
import { ItemData, UpdateItemRequest } from '@/lib/types/item';

export class CollectionRepository {
  private gitService: CollectionGitService | null = null;
  private itemRepository = new ItemRepository();

  private async getGitService(): Promise<CollectionGitService> {
    if (!this.gitService) {
      const dataRepo = process.env.DATA_REPOSITORY;
      if (!dataRepo) {
        throw new Error('DATA_REPOSITORY not configured. Please set DATA_REPOSITORY environment variable.');
      }

      const match = dataRepo.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        throw new Error('Invalid DATA_REPOSITORY format. Expected: https://github.com/owner/repo');
      }

      const [, owner, repo] = match;
      const gitConfig = {
        owner,
        repo,
        token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '',
        branch: process.env.GITHUB_BRANCH || 'main',
      };

      if (!gitConfig.token) {
        throw new Error('GitHub token not configured. Please set GH_TOKEN (or GITHUB_TOKEN) for collection sync.');
      }

      this.gitService = await createCollectionGitService(gitConfig);
    }

    return this.gitService;
  }

  async findAll(options: CollectionListOptions = {}): Promise<Collection[]> {
    const gitService = await this.getGitService();
    let collections = (await gitService.readCollections()).map((col) => ({
      ...col,
      item_count: Array.isArray(col.items) ? col.items.length : 0,
    }));

    if (!options.includeInactive) {
      collections = collections.filter((col) => col.isActive !== false);
    }

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      collections = collections.filter((col) =>
        col.name.toLowerCase().includes(searchLower) ||
        col.slug.toLowerCase().includes(searchLower) ||
        col.description.toLowerCase().includes(searchLower),
      );
    }

    const sortBy = options.sortBy || 'name';
    const sortOrder = options.sortOrder || 'asc';

    collections = collections.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'item_count':
          comparison = (a.item_count || 0) - (b.item_count || 0);
          break;
        case 'created_at':
          comparison = (a.created_at || '').localeCompare(b.created_at || '');
          break;
        case 'name':
        default:
          comparison = a.name.localeCompare(b.name);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return collections;
  }

  async findAllPaginated(options: CollectionListOptions = {}) {
    const { page = 1, limit = 10, ...filters } = options;
    const collections = await this.findAll(filters);
    const total = collections.length;
    const offset = (page - 1) * limit;
    const paginated = collections.slice(offset, offset + limit);

    return {
      collections: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string): Promise<Collection | null> {
    const gitService = await this.getGitService();
    const collections = await gitService.readCollections();
    const col = collections.find((c) => c.id === id);
    if (!col) return null;
    return {
      ...col,
      item_count: Array.isArray(col.items) ? col.items.length : 0,
    };
  }

  async create(data: CreateCollectionRequest): Promise<Collection> {
    this.validateCreateData(data);
    const gitService = await this.getGitService();
    return gitService.createCollection(data);
  }

  async update(data: UpdateCollectionRequest): Promise<Collection> {
    this.validateUpdateData(data);
    const gitService = await this.getGitService();
    return gitService.updateCollection(data);
  }

  async delete(id: string): Promise<void> {
    const gitService = await this.getGitService();

    const items = await this.itemRepository.findAll({ includeDeleted: true });
    for (const item of items) {
      if (Array.isArray(item.collections) && item.collections.includes(id)) {
        const nextCollections = item.collections.filter((colId) => colId !== id);
        await this.itemRepository.update(item.id, { ...item, collections: nextCollections });
      }
    }

    await gitService.deleteCollection(id);
  }

  async assignItems(collectionId: string, itemSlugs: string[]): Promise<{ collection: Collection; updatedItems: number }> {
    const gitService = await this.getGitService();
    const collection = await this.findById(collectionId);

    if (!collection) {
      throw new Error(`Collection with ID "${collectionId}" not found`);
    }

    // Deduplicate incoming slugs to avoid inflated counts
    const nextItemSlugs = Array.from(new Set(itemSlugs.filter(Boolean)));

    // Diff current vs new items to avoid loading all items
    const currentItemSlugs = collection.items || [];
    const slugsToAdd = nextItemSlugs.filter((slug) => !currentItemSlugs.includes(slug));
    const slugsToRemove = currentItemSlugs.filter((slug) => !nextItemSlugs.includes(slug));

    const itemUpdates: Array<{ id: string; data: UpdateItemRequest }> = [];

    // Load only the items that need changes in one shot
    const slugsToLoad = Array.from(new Set([...slugsToAdd, ...slugsToRemove]));
    const items = await this.itemRepository.findManyBySlugs(slugsToLoad, true);
    const bySlug = new Map(items.map((item) => [item.slug, item]));

    for (const slug of slugsToAdd) {
      const item = bySlug.get(slug);
      if (!item || item.deleted_at) continue;

      const collections = Array.isArray(item.collections) ? [...item.collections] : [];
      if (!collections.includes(collectionId)) {
        collections.push(collectionId);
        itemUpdates.push({ id: item.id, data: { ...item, collections } });
      }
    }

    for (const slug of slugsToRemove) {
      const item = bySlug.get(slug);
      if (!item) continue;

      const collections = Array.isArray(item.collections) ? [...item.collections] : [];
      const idx = collections.indexOf(collectionId);
      if (idx !== -1) {
        collections.splice(idx, 1);
        itemUpdates.push({ id: item.id, data: { ...item, collections } });
      }
    }

    const updatedCollection = { ...collection, item_count: nextItemSlugs.length, items: nextItemSlugs };

    try {
      // Update collection first; only update items after collection write succeeds
      const persisted = await gitService.updateCollection(updatedCollection);

      if (itemUpdates.length > 0) {
        await this.itemRepository.batchUpdate(itemUpdates);
      }

      return { collection: persisted, updatedItems: itemUpdates.length };
    } catch (error) {
      // Roll back collection to previous state if subsequent item updates fail
      try {
        await gitService.updateCollection(collection);
      } catch (rollbackError) {
        console.error('Rollback of collection failed after item update error:', rollbackError);
      }
      throw error;
    }
  }

  async getAssignedItems(collectionId: string): Promise<Array<Pick<ItemData, 'id' | 'name' | 'slug'>>> {
    const items = await this.itemRepository.findAll({ includeDeleted: true });
    return items
      .filter(
        (item) => !item.deleted_at && Array.isArray(item.collections) && item.collections.includes(collectionId)
      )
      .map((item) => ({ id: item.id, name: item.name, slug: item.slug }));
  }

  private validateCreateData(data: CreateCollectionRequest): void {
    if (!data.id || data.id.trim().length < COLLECTION_VALIDATION.ID_MIN_LENGTH) {
      throw new Error(`Collection ID must be at least ${COLLECTION_VALIDATION.ID_MIN_LENGTH} characters long`);
    }

    if (data.id.trim().length > COLLECTION_VALIDATION.ID_MAX_LENGTH) {
      throw new Error(`Collection ID must be no more than ${COLLECTION_VALIDATION.ID_MAX_LENGTH} characters long`);
    }

    if (!/^[a-z0-9-]+$/.test(data.id.trim())) {
      throw new Error('Collection ID must contain only lowercase letters, numbers, and hyphens');
    }

    if (!data.name || data.name.trim().length < COLLECTION_VALIDATION.NAME_MIN_LENGTH) {
      throw new Error(`Collection name must be at least ${COLLECTION_VALIDATION.NAME_MIN_LENGTH} characters long`);
    }

    if (data.name.trim().length > COLLECTION_VALIDATION.NAME_MAX_LENGTH) {
      throw new Error(`Collection name must be no more than ${COLLECTION_VALIDATION.NAME_MAX_LENGTH} characters long`);
    }

    if (data.description && data.description.trim().length > COLLECTION_VALIDATION.DESCRIPTION_MAX_LENGTH) {
      throw new Error(`Description must be no more than ${COLLECTION_VALIDATION.DESCRIPTION_MAX_LENGTH} characters long`);
    }
  }

  private validateUpdateData(data: UpdateCollectionRequest): void {
    if (!data.id) {
      throw new Error('Collection ID is required for updates');
    }

    if (data.name !== undefined) {
      if (data.name.trim().length < COLLECTION_VALIDATION.NAME_MIN_LENGTH) {
        throw new Error(`Collection name must be at least ${COLLECTION_VALIDATION.NAME_MIN_LENGTH} characters long`);
      }

      if (data.name.trim().length > COLLECTION_VALIDATION.NAME_MAX_LENGTH) {
        throw new Error(`Collection name must be no more than ${COLLECTION_VALIDATION.NAME_MAX_LENGTH} characters long`);
      }
    }

    if (data.description !== undefined && data.description.trim().length > COLLECTION_VALIDATION.DESCRIPTION_MAX_LENGTH) {
      throw new Error(`Description must be no more than ${COLLECTION_VALIDATION.DESCRIPTION_MAX_LENGTH} characters long`);
    }
  }
}

export const collectionRepository = new CollectionRepository();
