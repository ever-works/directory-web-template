import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as yaml from 'yaml';
import * as http from 'isomorphic-git/http/node';
import git from 'isomorphic-git';
import { Collection, CreateCollectionRequest, UpdateCollectionRequest } from '@/types/collection';
import { getContentPath } from '@/lib/lib';

interface GitConfig {
  owner: string;
  repo: string;
  token: string;
  branch?: string;
}

interface CollectionGitServiceConfig {
  dataDir: string;
  collectionsFile: string;
  gitConfig: GitConfig;
}

interface Committer {
  name?: string;
  email?: string;
}

export class CollectionGitService {
  private config: CollectionGitServiceConfig;
  private pendingChanges: Collection[] | null = null;
  private syncInProgress = false;
  private retryCount = 0;
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(config: CollectionGitServiceConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.config.dataDir, { recursive: true });
      await this.syncWithRemote();
      await this.ensureCollectionsFile();
    } catch (error) {
      console.error('❌ Failed to initialize Collection Git service:', error);
      throw error;
    }
  }

  private async syncWithRemote(): Promise<void> {
    try {
      const gitExists = await this.directoryExists(path.join(this.config.dataDir, '.git'));
      if (gitExists) {
        await this.pull();
      } else {
        await this.clone();
      }
    } catch (error) {
      console.error('❌ Git sync failed:', error);
      console.warn('⚠️ Collection Git service may be operating on stale data after sync failure');
      throw error;
    }
  }

  private async clone(): Promise<void> {
    const url = this.getRepositoryUrl();
    const auth = this.getAuth();

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

  private async ensureCollectionsFile(): Promise<void> {
    const collectionsPath = this.getCollectionsFilePath();
    try {
      await fs.access(collectionsPath);
    } catch {
      const defaultCollections: Collection[] = [];
      await this.writeCollections(defaultCollections);
    }
  }

  private getCollectionsFilePath(): string {
    return path.join(this.config.dataDir, this.config.collectionsFile);
  }

  private getRepositoryUrl(): string {
    return `https://github.com/${this.config.gitConfig.owner}/${this.config.gitConfig.repo}`;
  }

  private getAuth() {
    return {
      username: 'x-access-token',
      password: this.config.gitConfig.token,
    };
  }

  private getCommitter(committer: Committer = {}): Committer {
    return {
      email: committer.email || process.env.GIT_EMAIL || 'website@ever.works',
      name: committer.name || process.env.GIT_NAME || 'Website Bot',
    };
  }

  async readCollections(): Promise<Collection[]> {
    try {
      const collectionsPath = this.getCollectionsFilePath();
      const content = await fs.readFile(collectionsPath, 'utf-8');
      return yaml.parse(content) || [];
    } catch (error) {
      console.error('❌ Failed to read collections:', error);
      return [];
    }
  }

  async writeCollections(collections: Collection[]): Promise<void> {
    try {
      const collectionsPath = this.getCollectionsFilePath();
      console.log(`[WRITE COLLECTIONS] Writing ${collections.length} collections to:`, collectionsPath);
      const content = yaml.stringify(collections);

      await fs.writeFile(collectionsPath, content, 'utf-8');
      console.log(`[WRITE COLLECTIONS] File written successfully`);

      try {
        await git.add({
          fs,
          dir: this.config.dataDir,
          filepath: this.config.collectionsFile,
        });

        const committer = this.getCommitter();
        await git.commit({
          fs,
          dir: this.config.dataDir,
          message: `Update collections - ${new Date().toISOString()}`,
          author: committer,
          committer,
        });

        const auth = this.getAuth();
        await git.push({
          onAuth: () => auth,
          fs,
          http,
          dir: this.config.dataDir,
        });
        console.log(`[WRITE COLLECTIONS] Git push successful`);
      } catch (gitError) {
        console.error('⚠️ [WRITE COLLECTIONS] Git operations failed, but local file was saved:', gitError);
        this.mergePendingChanges(collections);
        if (!this.syncInProgress) {
          this.scheduleBackgroundSync();
        }
      }
    } catch (error) {
      console.error('❌ Failed to write collections:', error);
      throw error;
    }
  }

  /**
   * Merge new pending state into existing pending changes by collection id to avoid overwriting.
   */
  private mergePendingChanges(next: Collection[]): void {
    if (!this.pendingChanges) {
      this.pendingChanges = next;
      return;
    }

    // Use next as authoritative: start from next, then keep only *new* pending ids
    const byId = new Map(next.map((c) => [c.id, c] as const));

    for (const existing of this.pendingChanges) {
      if (!byId.has(existing.id)) {
        byId.set(existing.id, existing);
      }
      // if existing id is already in next, we keep next (newer) to avoid overwriting recent edits
      // if existing id is not in next, it was deleted -> do not re-add
    }

    this.pendingChanges = Array.from(byId.values());
  }

  async createCollection(data: CreateCollectionRequest): Promise<Collection> {
    const collections = await this.readCollections();

    const slug = (data.slug || data.id).trim();
    const id = data.id.trim();

    if (collections.find((col) => col.id === id)) {
      throw new Error(`Collection with ID "${id}" already exists`);
    }

    if (collections.find((col) => col.slug === slug)) {
      throw new Error(`Collection with slug "${slug}" already exists`);
    }

    const now = new Date().toISOString();
    const newCollection: Collection = {
      id,
      slug,
      name: data.name.trim(),
      description: data.description?.trim() || '',
      icon_url: data.icon_url?.trim(),
      isActive: data.isActive ?? true,
      item_count: 0,
      created_at: now,
      updated_at: now,
    };

    collections.push(newCollection);
    await this.writeCollections(collections);
    return newCollection;
  }

  async updateCollection(data: UpdateCollectionRequest): Promise<Collection> {
    const collections = await this.readCollections();
    const index = collections.findIndex((col) => col.id === data.id);

    if (index === -1) {
      throw new Error(`Collection with ID "${data.id}" not found`);
    }

    const incomingSlug = data.slug?.trim();
    if (incomingSlug && collections.find((col) => col.id !== data.id && col.slug === incomingSlug)) {
      throw new Error(`Collection with slug "${incomingSlug}" already exists`);
    }

    const updated: Collection = {
      ...collections[index],
      ...data,
      slug: incomingSlug || collections[index].slug,
      name: data.name?.trim() || collections[index].name,
      description: data.description?.trim() ?? collections[index].description,
      icon_url: data.icon_url?.trim() ?? collections[index].icon_url,
      isActive: data.isActive ?? collections[index].isActive,
      item_count: data.item_count ?? collections[index].item_count,
      updated_at: new Date().toISOString(),
    };

    collections[index] = updated;
    await this.writeCollections(collections);
    return updated;
  }

  async deleteCollection(id: string): Promise<void> {
    const collections = await this.readCollections();
    const filtered = collections.filter((col) => col.id !== id);

    if (filtered.length === collections.length) {
      throw new Error(`Collection with ID "${id}" not found`);
    }

    await this.writeCollections(filtered);
  }

  async getStatus() {
    const collections = await this.readCollections();
    return {
      repoUrl: this.getRepositoryUrl(),
      branch: this.config.gitConfig.branch || 'main',
      lastSync: new Date().toISOString(),
      collectionsCount: collections.length,
    };
  }

  private scheduleBackgroundSync(): void {
    if (this.syncInProgress || this.retryTimeout) return;

    this.retryTimeout = setTimeout(() => {
      this.performBackgroundSync();
    }, 30000);
  }

  private async performBackgroundSync(): Promise<void> {
    if (!this.pendingChanges || this.syncInProgress) return;

    this.syncInProgress = true;

    try {
      await this.syncWithRemote();
      await this.pushPendingChanges();
      this.retryCount = 0;

      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }
    } catch (error) {
      console.error('❌ Background sync failed:', error);

      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = Math.min(30000 * Math.pow(2, this.retryCount - 1), 300000);

        if (this.retryTimeout) {
          clearTimeout(this.retryTimeout);
        }

        this.retryTimeout = setTimeout(() => {
          this.retryTimeout = null;
          if (this.syncInProgress) {
            return;
          }
          this.performBackgroundSync();
        }, delay);
      } else {
        this.retryCount = 0;
      }
    } finally {
      // Always clear sync flag so future sync attempts can proceed
      this.syncInProgress = false;
    }
  }

  private async pushPendingChanges(): Promise<void> {
    if (!this.pendingChanges) return;

    try {
      // Ensure pending changes are re-applied after sync to avoid loss from git pulls
      const collectionsPath = this.getCollectionsFilePath();
      await fs.writeFile(collectionsPath, yaml.stringify(this.pendingChanges), 'utf-8');

      await git.add({
        fs,
        dir: this.config.dataDir,
        filepath: this.config.collectionsFile,
      });

      const committer = this.getCommitter();
      await git.commit({
        fs,
        dir: this.config.dataDir,
        message: `Background sync: Update collections - ${new Date().toISOString()}`,
        author: committer,
        committer,
      });

      const auth = this.getAuth();
      await git.push({
        onAuth: () => auth,
        fs,
        http,
        dir: this.config.dataDir,
      });

      this.pendingChanges = null;
    } catch (error) {
      console.error('❌ Failed to push pending collection changes:', error);
      throw error;
    }
  }

  cleanup(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    this.syncInProgress = false;
    this.retryCount = 0;
  }
}

export async function createCollectionGitService(
  gitConfig: GitConfig,
  dataDir: string = getContentPath()
): Promise<CollectionGitService> {
  const service = new CollectionGitService({
    dataDir,
    collectionsFile: 'collections.yml',
    gitConfig,
  });

  await service.initialize();
  return service;
}
