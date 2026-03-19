import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as yaml from 'yaml';
import { TagData, CreateTagRequest, UpdateTagRequest } from '@/lib/types/tag';

export interface TagGitServiceConfig {
  owner: string;
  repo: string;
  token: string;
  branch: string;
  dataDir: string;
  tagsFile: string;
}

export interface ICommitter {
  name: string;
  email: string;
}

export class TagGitService {
  private config: TagGitServiceConfig;
  private pendingChanges: TagData[] | null = null;
  private syncInProgress = false;
  private retryCount = 0;
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(config: TagGitServiceConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Ensure data directory exists
    await fs.mkdir(this.config.dataDir, { recursive: true });
    
    // Ensure tags.yml exists
    const tagsPath = this.getTagsFilePath();
    try {
      await fs.access(tagsPath);
    } catch {
      // File doesn't exist, create it with empty array
      await fs.writeFile(tagsPath, yaml.stringify([]), 'utf-8');
    }
  }

  async readTags(): Promise<TagData[]> {
    try {
      const filePath = path.join(this.config.dataDir, 'tags.yml');
      console.log('🔍 Reading tags from:', filePath);
      
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const tags = yaml.parse(fileContent) as any[];
      
      // Ensure all tags have isActive field for backward compatibility
      return tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        isActive: tag.isActive !== undefined ? tag.isActive : true, // Default to true for existing tags
      }));
    } catch (error) {
      console.error('❌ Error reading tags:', error);
      return [];
    }
  }

  async writeTags(tags: TagData[]): Promise<void> {
    try {
      const filePath = path.join(this.config.dataDir, 'tags.yml');
      console.log('💾 Writing tags to:', filePath);
      
      // Ensure all tags have the required fields
      const normalizedTags = tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        isActive: tag.isActive,
      }));
      
      const content = yaml.stringify(normalizedTags);
      await fs.writeFile(filePath, content, 'utf-8');
      
      // Commit and push changes
      await this.commitAndPush('Update tags');
    } catch (error) {
      console.error('❌ Error writing tags:', error);
      throw error;
    }
  }

  private async commitAndPush(message: string): Promise<void> {
    try {
      const git = (await import('isomorphic-git')).default;
      const http = (await import('isomorphic-git/http/node')).default;

      // Add to git
      await git.add({
        fs,
        dir: this.config.dataDir,
        filepath: this.config.tagsFile,
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

      console.log('✅ Tags committed and pushed to GitHub successfully');
    } catch (gitError) {
      console.error('⚠️ Git operations failed, but local file was saved:', gitError);
      // Store pending changes for later sync
      this.pendingChanges = await this.readTags();
      // Try to sync in background
      this.scheduleBackgroundSync();
      // Don't throw error - local file was saved successfully
    }
  }

  async createTag(data: CreateTagRequest): Promise<TagData> {
    const tags = await this.readTags();
    
    // Check for duplicate ID
    if (tags.some(tag => tag.id === data.id)) {
      throw new Error(`Tag with ID '${data.id}' already exists`);
    }
    
    // Check for duplicate name
    if (tags.some(tag => tag.name.toLowerCase() === data.name.toLowerCase())) {
      throw new Error(`Tag with name '${data.name}' already exists`);
    }

    const newTag: TagData = {
      id: data.id,
      name: data.name,
      isActive: data.isActive,
    };

    tags.push(newTag);
    await this.writeTags(tags);
    
    return newTag;
  }

  async updateTag(id: string, data: UpdateTagRequest): Promise<TagData> {
    const tags = await this.readTags();
    const tagIndex = tags.findIndex(tag => tag.id === id);
    
    if (tagIndex === -1) {
      throw new Error(`Tag with ID '${id}' not found`);
    }

    // Check for duplicate name (excluding current tag)
    if (data.name) {
      const name = data.name;
      if (tags.some(tag => tag.id !== id && tag.name.toLowerCase() === name.toLowerCase())) {
        throw new Error(`Tag with name '${name}' already exists`);
      }
    }

    const updatedTag: TagData = {
      ...tags[tagIndex],
      id, // Ensure ID doesn't change
    };

    // Only update name if provided
    if (data.name) {
      updatedTag.name = data.name;
    }

    // Update isActive if provided
    if (data.isActive !== undefined) {
      updatedTag.isActive = data.isActive;
    }

    tags[tagIndex] = updatedTag;
    await this.writeTags(tags);
    
    return updatedTag;
  }

  async deleteTag(id: string): Promise<void> {
    const tags = await this.readTags();
    const tagIndex = tags.findIndex(tag => tag.id === id);
    
    if (tagIndex === -1) {
      throw new Error(`Tag with ID '${id}' not found`);
    }

    tags.splice(tagIndex, 1);
    await this.writeTags(tags);
  }

  async findTagById(id: string): Promise<TagData | null> {
    const tags = await this.readTags();
    return tags.find(tag => tag.id === id) || null;
  }

  async findTagByName(name: string): Promise<TagData | null> {
    const tags = await this.readTags();
    return tags.find(tag => tag.name.toLowerCase() === name.toLowerCase()) || null;
  }

  async getAllTags(): Promise<TagData[]> {
    return await this.readTags();
  }

  async getTagsPaginated(page: number = 1, limit: number = 10): Promise<{
    tags: TagData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const allTags = await this.readTags();
    const total = allTags.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const tags = allTags.slice(startIndex, endIndex);

    return {
      tags,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async checkDuplicateName(name: string, excludeId?: string): Promise<boolean> {
    const tags = await this.readTags();
    return tags.some(tag => 
      tag.name.toLowerCase() === name.toLowerCase() && 
      tag.id !== excludeId
    );
  }

  async checkDuplicateId(id: string): Promise<boolean> {
    const tags = await this.readTags();
    return tags.some(tag => tag.id === id);
  }

  private getTagsFilePath(): string {
    return path.join(this.config.dataDir, this.config.tagsFile);
  }

  private getCommitter(): ICommitter {
    return {
      name: 'Ever Works Admin',
      email: 'admin@everworks.com',
    };
  }

  private getAuth() {
    return {
      username: this.config.token,
      password: '',
    };
  }

  private scheduleBackgroundSync(): void {
    if (this.syncInProgress) {
      return; // Already syncing
    }

    // Schedule sync after 30 seconds
    setTimeout(() => {
      this.performBackgroundSync();
    }, 30000);
  }

  private async performBackgroundSync(): Promise<void> {
    if (!this.pendingChanges || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    console.log(`🔄 Attempting background sync of pending changes... (attempt ${this.retryCount + 1}/${this.maxRetries + 1})`);

    try {
      // Try to sync with remote first
      await this.syncWithRemote();

      // Then try to push pending changes
      await this.pushPendingChanges();

      console.log('✅ Background sync completed successfully');
      this.retryCount = 0; // Reset retry count on success
    } catch (error) {
      console.error('❌ Background sync failed:', error);
      
      // Implement exponential backoff with maximum retries
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = Math.min(30000 * Math.pow(2, this.retryCount - 1), 300000); // Exponential backoff: 30s, 60s, 120s, max 5min
        
        console.log(`⏰ Scheduling retry in ${delay / 1000} seconds... (attempt ${this.retryCount}/${this.maxRetries})`);
        
        // Clear any existing timeout to prevent memory leaks
        if (this.retryTimeout) {
          clearTimeout(this.retryTimeout);
        }
        
        this.retryTimeout = setTimeout(() => {
          this.syncInProgress = false;
          this.performBackgroundSync();
        }, delay);
      } else {
        console.error('❌ Max retries reached. Stopping background sync attempts.');
        this.retryCount = 0; // Reset for next manual trigger
      }
    } finally {
      if (this.retryCount >= this.maxRetries) {
        this.syncInProgress = false;
      }
    }
  }

  private async pushPendingChanges(): Promise<void> {
    if (!this.pendingChanges) {
      return;
    }

    try {
      const git = (await import('isomorphic-git')).default;
      const http = (await import('isomorphic-git/http/node')).default;

      // Add to git
      await git.add({
        fs,
        dir: this.config.dataDir,
        filepath: this.config.tagsFile,
      });

      // Commit changes
      const committer = this.getCommitter();
      await git.commit({
        fs,
        dir: this.config.dataDir,
        message: `Background sync: Update tags - ${new Date().toISOString()}`,
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
      this.pendingChanges = null; // Clear pending changes
    } catch (error) {
      console.error('❌ Failed to push pending changes:', error);
      throw error;
    }
  }

  private async syncWithRemote(): Promise<void> {
    try {
      const git = (await import('isomorphic-git')).default;
      const http = (await import('isomorphic-git/http/node')).default;

      // Pull latest changes
      const auth = this.getAuth();
      await git.pull({
        onAuth: () => auth,
        fs,
        http,
        dir: this.config.dataDir,
        ref: this.config.branch,
        singleBranch: true,
      });
    } catch (error) {
      console.error('❌ Failed to sync with remote:', error);
      throw error;
    }
  }

  async getSyncStatus(): Promise<{
    hasPendingChanges: boolean;
    syncInProgress: boolean;
    lastSyncAttempt?: string;
    retryCount?: number;
  }> {
    return {
      hasPendingChanges: this.pendingChanges !== null,
      syncInProgress: this.syncInProgress,
      lastSyncAttempt: this.syncInProgress ? new Date().toISOString() : undefined,
      retryCount: this.retryCount,
    };
  }

  /**
   * Clean up resources and stop retries
   */
  cleanup(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    this.syncInProgress = false;
    this.retryCount = 0;
  }
}

export async function createTagGitService(config: TagGitServiceConfig): Promise<TagGitService> {
  const service = new TagGitService(config);
  await service.initialize();
  return service;
} 