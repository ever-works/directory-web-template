import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as yaml from 'yaml';
import { ItemData, CreateItemRequest, UpdateItemRequest, ReviewRequest } from '@/lib/types/item';

// Helper function to format date in the expected format for YAML files
function formatDateForYaml(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export interface ItemGitServiceConfig {
  owner: string;
  repo: string;
  token: string;
  branch: string;
  dataDir: string;
  itemsDir: string;
}

export interface ICommitter {
  name: string;
  email: string;
}

export class ItemGitService {
  private config: ItemGitServiceConfig;
  private pendingChanges: ItemData[] | null = null;
  private syncInProgress = false;

  constructor(config: ItemGitServiceConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Ensure data directory exists
    await fs.mkdir(this.config.dataDir, { recursive: true });
    await fs.mkdir(path.join(this.config.dataDir, this.config.itemsDir), { recursive: true });
    
    // Sync with remote repository
    await this.syncWithRemote();
  }

  private async syncWithRemote(): Promise<void> {
    try {
      const exists = await this.directoryExists(path.join(this.config.dataDir, '.git'));
      
      if (exists) {
        // Pull latest changes
        await this.pull();
      } else {
        // Clone repository
        await this.clone();
      }
    } catch (error) {
      console.error('❌ Git sync failed:', error);
      // Continue with local data if sync fails
    }
  }

  private async clone(): Promise<void> {
    const url = this.getRepositoryUrl();
    const auth = this.getAuth();

    const git = (await import('isomorphic-git')).default;
    const http = (await import('isomorphic-git/http/node')).default;

    await git.clone({
      onAuth: () => auth,
      fs,
      http,
      dir: this.config.dataDir,
      url,
      singleBranch: true,
    });
  }

  private async pull(): Promise<void> {
    try {
      const auth = this.getAuth();
      const committer = this.getCommitter();

      const git = (await import('isomorphic-git')).default;
      const http = (await import('isomorphic-git/http/node')).default;

      await git.pull({
        onAuth: () => auth,
        fs,
        http,
        dir: this.config.dataDir,
        author: committer,
        singleBranch: true,
      });
    } catch (error) {
      console.error('❌ Git pull failed:', error);
      throw error;
    }
  }

  private async directoryExists(dir: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dir);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  async readItems(includeDeleted: boolean = false): Promise<ItemData[]> {
    try {
      const dataDir = path.join(this.config.dataDir, 'data');

      // Check if data directory exists before trying to read it
      try {
        await fs.access(dataDir);
      } catch {
        console.warn('📁 Data directory does not exist:', dataDir);
        return [];
      }

      const itemDirs = await fs.readdir(dataDir);

      const items: ItemData[] = [];

      for (const itemDir of itemDirs) {
        const itemDirPath = path.join(dataDir, itemDir);
        const itemDirStat = await fs.stat(itemDirPath);

        if (itemDirStat.isDirectory()) {
          const itemFile = path.join(itemDirPath, `${itemDir}.yml`);

          try {
            const content = await fs.readFile(itemFile, 'utf-8');
            const item = yaml.parse(content) as any;

            // Ensure required fields have defaults
            const normalizedItem: ItemData = {
              id: itemDir, // Use directory name as ID
              name: item.name || '',
              slug: itemDir, // Use directory name as slug
              description: item.description || '',
              source_url: item.source_url || '',
              category: Array.isArray(item.category) ? item.category : [item.category].filter(Boolean),
              tags: Array.isArray(item.tags) ? item.tags : [],
              featured: item.featured || false,
              icon_url: item.icon_url,
              updated_at: item.updated_at || formatDateForYaml(),
              status: item.status || 'approved', // Read status from YAML or default to approved
              submitted_by: item.submitted_by,
              submitted_at: item.submitted_at || item.updated_at || formatDateForYaml(),
              reviewed_by: item.reviewed_by || 'admin',
              reviewed_at: item.reviewed_at || item.updated_at || formatDateForYaml(),
              review_notes: item.review_notes,
              deleted_at: item.deleted_at, // Include soft delete timestamp
            };

            // Filter out deleted items unless includeDeleted is true
            if (!includeDeleted && normalizedItem.deleted_at) {
              continue;
            }

            items.push(normalizedItem);
          } catch (fileError) {
            console.warn(`⚠️ Could not read item file ${itemFile}:`, fileError);
            // Continue with other items
          }
        }
      }

      console.log(`📦 Loaded ${items.length} items from .content/data`);
      return items;
    } catch (error) {
      console.error('❌ Error reading items:', error);
      return [];
    }
  }

  // Read only the specified item slugs to avoid full directory scans
  async readItemsBySlugs(slugs: string[], includeDeleted: boolean = false): Promise<ItemData[]> {
    if (!slugs.length) return [];

    const uniqueSlugs = Array.from(new Set(slugs)).filter((slug) => /^[a-z0-9-]+$/.test(slug));
    const dataDir = path.join(this.config.dataDir, 'data');
    const results: ItemData[] = [];

    // Check data directory exists
    try {
      await fs.access(dataDir);
    } catch {
      console.warn('📁 Data directory does not exist:', dataDir);
      return [];
    }

    for (const slug of uniqueSlugs) {
      const itemDir = path.join(dataDir, slug);
      const itemFile = path.join(itemDir, `${slug}.yml`);

      try {
        const stat = await fs.stat(itemDir);
        if (!stat.isDirectory()) continue;

        const content = await fs.readFile(itemFile, 'utf-8');
        const item = yaml.parse(content) as any;

        const normalized: ItemData = {
          id: slug,
          name: item.name || '',
          slug,
          description: item.description || '',
          source_url: item.source_url || '',
          category: Array.isArray(item.category) ? item.category : [item.category].filter(Boolean),
          tags: Array.isArray(item.tags) ? item.tags : [],
          featured: item.featured || false,
          icon_url: item.icon_url,
          updated_at: item.updated_at || formatDateForYaml(),
          status: item.status || 'approved',
          submitted_by: item.submitted_by,
          submitted_at: item.submitted_at || item.updated_at || formatDateForYaml(),
          reviewed_by: item.reviewed_by || 'admin',
          reviewed_at: item.reviewed_at || item.updated_at || formatDateForYaml(),
          review_notes: item.review_notes,
          deleted_at: item.deleted_at,
          collections: Array.isArray(item.collections) ? item.collections : (item.collections ? [item.collections] : []),
        };

        if (includeDeleted || !normalized.deleted_at) {
          results.push(normalized);
        }
      } catch (error) {
        // Skip missing or unreadable items, but log for visibility
        const message = (error as any)?.message ?? String(error);
        const safeSlug = String(slug);
        const safeMessage = String(message);
        console.warn(`⚠️ Unable to read item '${safeSlug}': ${safeMessage}`);
      }
    }

    return results;
  }

  private async writeItemFile(item: ItemData): Promise<void> {
    try {
      const dataDir = path.join(this.config.dataDir, 'data');
      const itemDir = path.join(dataDir, item.slug);
      const itemFile = path.join(itemDir, `${item.slug}.yml`);

      // Ensure item directory exists
      await fs.mkdir(itemDir, { recursive: true });

      // Prepare item data for writing (include status for admin management)
      const itemData: Record<string, unknown> = {
        name: item.name,
        description: item.description,
        source_url: item.source_url,
        category: item.category,
        tags: item.tags,
        collections: item.collections || [],
        featured: item.featured,
        icon_url: item.icon_url,
        updated_at: item.updated_at,
        status: item.status, // Include status for admin management
        submitted_by: item.submitted_by,
        submitted_at: item.submitted_at,
        reviewed_by: item.reviewed_by,
        reviewed_at: item.reviewed_at,
        review_notes: item.review_notes,
      };

      // Include deleted_at for soft delete (only if set)
      if (item.deleted_at) {
        itemData.deleted_at = item.deleted_at;
      }

      // Write item data
      const content = yaml.stringify(itemData);
      await fs.writeFile(itemFile, content, 'utf-8');
    } catch (error) {
      console.error('❌ Error writing item file:', error);
      throw error;
    }
  }

  async writeItem(item: ItemData): Promise<void> {
    await this.writeItemFile(item);
    await this.commitAndPush(`Update item: ${item.name}`);
  }

  private async commitAndPush(message: string): Promise<void> {
    try {
      const git = (await import('isomorphic-git')).default;
      const http = (await import('isomorphic-git/http/node')).default;

      // Add all changes
      await git.add({
        fs,
        dir: this.config.dataDir,
        filepath: '.',
      });

      // Commit changes
      const committer = this.getCommitter();
      await git.commit({
        fs,
        dir: this.config.dataDir,
        message: `${message} - ${new Date().toISOString()}`,
        author: committer,
        committer: committer,
      });

      // Push to GitHub
      const auth = this.getAuth();
      await git.push({
        onAuth: () => auth,
        fs,
        http,
        dir: this.config.dataDir,
      });

      console.log('✅ Items committed and pushed to GitHub successfully');
    } catch (gitError) {
      console.error('⚠️ Git operations failed, but local file was saved:', gitError);
      // Store pending changes for later sync
      this.pendingChanges = await this.readItems();
      // Try to sync in background
      this.scheduleBackgroundSync();
      // Don't throw error - local file was saved successfully
    }
  }

  async createItem(data: CreateItemRequest): Promise<ItemData> {
    const items = await this.readItems(true);

    // Check for duplicate ID
    if (items.some(item => item.id === data.id)) {
      throw new Error(`Item with ID '${data.id}' already exists`);
    }
    
    // Check for duplicate slug
    if (items.some(item => item.slug === data.slug)) {
      throw new Error(`Item with slug '${data.slug}' already exists`);
    }

    const newItem: ItemData = {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      source_url: data.source_url,
      category: data.category,
      tags: data.tags,
      collections: data.collections || [],
      featured: data.featured || false,
      icon_url: data.icon_url,
      updated_at: formatDateForYaml(),
      status: data.status || 'draft',
      submitted_by: data.submitted_by || 'anonymous',
      submitted_at: formatDateForYaml(),
    };

    await this.writeItem(newItem);
    return newItem;
  }

  async updateItem(id: string, data: UpdateItemRequest): Promise<ItemData> {
    const items = await this.readItems(true);
    const itemIndex = items.findIndex(item => item.id === id);
    
    if (itemIndex === -1) {
      throw new Error(`Item with ID '${id}' not found`);
    }

    const updatedItem: ItemData = {
      ...items[itemIndex],
      ...data,
      id, // Ensure ID doesn't change
      updated_at: formatDateForYaml(),
    };

    await this.writeItem(updatedItem);
    return updatedItem;
  }

  async updateItemWithoutCommit(id: string, data: UpdateItemRequest): Promise<ItemData> {
    const items = await this.readItems(true);
    const itemIndex = items.findIndex(item => item.id === id);
    
    if (itemIndex === -1) {
      throw new Error(`Item with ID '${id}' not found`);
    }

    const updatedItem: ItemData = {
      ...items[itemIndex],
      ...data,
      id,
      updated_at: formatDateForYaml(),
    };

    await this.writeItemFile(updatedItem);
    return updatedItem;
  }

  async commitAndPushBatch(message: string): Promise<void> {
    await this.commitAndPush(message);
  }

  async reviewItem(id: string, reviewData: ReviewRequest): Promise<ItemData> {
    const items = await this.readItems(true);
    const itemIndex = items.findIndex(item => item.id === id);
    
    if (itemIndex === -1) {
      throw new Error(`Item with ID '${id}' not found`);
    }

    const updatedItem: ItemData = {
      ...items[itemIndex],
      status: reviewData.status,
      review_notes: reviewData.review_notes,
      reviewed_by: 'admin', // TODO: Get from session
      reviewed_at: formatDateForYaml(),
      updated_at: formatDateForYaml(),
    };

    await this.writeItem(updatedItem);
    return updatedItem;
  }

  async deleteItem(id: string): Promise<void> {
    const items = await this.readItems(true);
    const item = items.find(item => item.id === id);

    if (!item) {
      throw new Error(`Item with ID '${id}' not found`);
    }

    // Delete item file
    const dataDir = path.join(this.config.dataDir, 'data');
    const itemDir = path.join(dataDir, item.slug);
    const itemFile = path.join(itemDir, `${item.slug}.yml`);

    try {
      await fs.unlink(itemFile);
      // Try to remove directory if empty
      const remainingFiles = await fs.readdir(itemDir);
      if (remainingFiles.length === 0) {
        await fs.rmdir(itemDir);
      }

      await this.commitAndPush(`Delete item: ${item.name}`);
    } catch (error) {
      console.error('❌ Error deleting item:', error);
      throw error;
    }
  }

  async softDeleteItem(id: string): Promise<ItemData> {
    const items = await this.readItems(true); // Include already deleted items
    const item = items.find(item => item.id === id);

    if (!item) {
      throw new Error(`Item with ID '${id}' not found`);
    }

    if (item.deleted_at) {
      throw new Error(`Item with ID '${id}' is already deleted`);
    }

    const updatedItem: ItemData = {
      ...item,
      deleted_at: formatDateForYaml(),
      updated_at: formatDateForYaml(),
    };

    await this.writeItem(updatedItem);
    return updatedItem;
  }

  async restoreItem(id: string): Promise<ItemData> {
    const items = await this.readItems(true); // Include deleted items
    const item = items.find(item => item.id === id);

    if (!item) {
      throw new Error(`Item with ID '${id}' not found`);
    }

    if (!item.deleted_at) {
      throw new Error(`Item with ID '${id}' is not deleted`);
    }

    const updatedItem: ItemData = {
      ...item,
      deleted_at: undefined,
      updated_at: formatDateForYaml(),
    };

    await this.writeItem(updatedItem);
    return updatedItem;
  }

  async findItemById(id: string, includeDeleted: boolean = false): Promise<ItemData | null> {
    const items = await this.readItems(includeDeleted);
    return items.find(item => item.id === id) || null;
  }

  async findItemBySlug(slug: string, includeDeleted: boolean = false): Promise<ItemData | null> {
    const items = await this.readItems(includeDeleted);
    return items.find(item => item.slug === slug) || null;
  }

  async getItemsPaginated(page: number = 1, limit: number = 10, options: {
    status?: string;
    categories?: string[];
    tags?: string[];
    includeDeleted?: boolean;
    submittedBy?: string;
    search?: string;
    sortBy?: 'name' | 'updated_at' | 'status' | 'submitted_at';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    items: ItemData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    let allItems = await this.readItems(options.includeDeleted ?? false);

    // Apply filters
    if (options.status) {
      allItems = allItems.filter(item => item.status === options.status);
    }

    if (options.categories && options.categories.length > 0) {
      allItems = allItems.filter(item => {
        // OR logic: item must have at least one of the selected categories
        const itemCategories = Array.isArray(item.category) ? item.category : [item.category].filter(Boolean);
        return options.categories!.some(cat => itemCategories.includes(cat));
      });
    }

    if (options.tags && options.tags.length > 0) {
      // OR logic: item must have at least one of the selected tags
      allItems = allItems.filter(item => options.tags!.some(tag => item.tags.includes(tag)));
    }

    // Filter by submitter (for client item management)
    if (options.submittedBy) {
      allItems = allItems.filter(item => item.submitted_by === options.submittedBy);
    }

    // Search by name or description
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      allItems = allItems.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort items
    const sortBy = options.sortBy || 'updated_at';
    const sortOrder = options.sortOrder || 'desc';

    allItems.sort((a, b) => {
      let aVal: string;
      let bVal: string;

      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'submitted_at':
          aVal = a.submitted_at || '';
          bVal = b.submitted_at || '';
          break;
        case 'updated_at':
        default:
          aVal = a.updated_at;
          bVal = b.updated_at;
          break;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = allItems.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const items = allItems.slice(startIndex, endIndex);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  private getRepositoryUrl(): string {
    return `https://github.com/${this.config.owner}/${this.config.repo}`;
  }

  private getAuth() {
    return {
      username: 'x-access-token',
      password: this.config.token,
    };
  }

  private getCommitter(): ICommitter {
    return {
      name: 'Ever Works Admin',
      email: 'admin@everworks.com',
    };
  }

  private scheduleBackgroundSync(): void {
    if (this.syncInProgress) return;
    
    setTimeout(() => {
      this.performBackgroundSync();
    }, 30000); // 30 seconds
  }

  private async performBackgroundSync(): Promise<void> {
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;
    console.log('🔄 Performing background sync...');
    
    try {
      await this.pushPendingChanges();
    } catch (error) {
      console.error('❌ Background sync failed:', error);
      // Schedule another retry in 5 minutes
      setTimeout(() => {
        this.syncInProgress = false;
        this.performBackgroundSync();
      }, 300000); // 5 minutes
    } finally {
      this.syncInProgress = false;
    }
  }

  private async pushPendingChanges(): Promise<void> {
    if (!this.pendingChanges) return;
    
    try {
      const git = (await import('isomorphic-git')).default;
      const http = (await import('isomorphic-git/http/node')).default;

      // Add all changes
      await git.add({
        fs,
        dir: this.config.dataDir,
        filepath: '.',
      });

      // Commit changes
      const committer = this.getCommitter();
      await git.commit({
        fs,
        dir: this.config.dataDir,
        message: `Background sync: Update items - ${new Date().toISOString()}`,
        author: committer,
        committer: committer,
      });

      // Push to GitHub
      const auth = this.getAuth();
      await git.push({
        onAuth: () => auth,
        fs,
        http,
        dir: this.config.dataDir,
      });

      console.log('✅ Pending changes pushed to GitHub');
      this.pendingChanges = null;
    } catch (error) {
      console.error('❌ Failed to push pending changes:', error);
      throw error;
    }
  }

  async getSyncStatus(): Promise<{
    hasPendingChanges: boolean;
    syncInProgress: boolean;
    lastSyncAttempt?: string;
  }> {
    return {
      hasPendingChanges: this.pendingChanges !== null,
      syncInProgress: this.syncInProgress,
    };
  }
}

export async function createItemGitService(config: ItemGitServiceConfig): Promise<ItemGitService> {
  const service = new ItemGitService(config);
  await service.initialize();
  return service;
} 