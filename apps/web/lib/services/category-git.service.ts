import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as yaml from 'yaml';
import * as http from 'isomorphic-git/http/node';
import git from 'isomorphic-git';
import { CategoryData, CreateCategoryRequest, UpdateCategoryRequest } from '@/lib/types/category';

interface GitConfig {
  owner: string;
  repo: string;
  token: string;
  branch?: string;
}

interface CategoryGitServiceConfig {
  dataDir: string;
  categoriesFile: string;
  gitConfig: GitConfig;
}

interface ICommitter {
  name?: string;
  email?: string;
}

export class CategoryGitService {
  private config: CategoryGitServiceConfig;
  private pendingChanges: CategoryData[] | null = null;
  private syncInProgress = false;
  private retryCount = 0;
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(config: CategoryGitServiceConfig) {
    this.config = config;
  }

  /**
   * Initialize the Git repository and sync categories
   */
  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(this.config.dataDir, { recursive: true });
      
      // Sync with remote repository
      await this.syncWithRemote();
      
      // Ensure categories file exists
      await this.ensureCategoriesFile();
      
      console.log('✅ Category Git service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Category Git service:', error);
      throw error;
    }
  }

  /**
   * Sync with remote repository
   */
  private async syncWithRemote(): Promise<void> {
    try {
      // Check if .content is already a git repository
      const gitExists = await this.directoryExists(path.join(this.config.dataDir, '.git'));
      
      if (gitExists) {
        console.log('📥 Pulling latest changes...');
        await this.pull();
      } else {
        console.log('📥 Cloning repository...');
        await this.clone();
      }
    } catch (error) {
      console.error('❌ Git sync failed:', error);
      // Continue without sync if it fails - use existing local data
    }
  }

  /**
   * Clone repository
   */
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

  /**
   * Pull latest changes
   */
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
      // If pull fails, we'll continue with local data
      throw error;
    }
  }

  /**
   * Check if directory exists
   */
  private async directoryExists(dir: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dir);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }





  /**
   * Ensure categories file exists
   */
  private async ensureCategoriesFile(): Promise<void> {
    const categoriesPath = this.getCategoriesFilePath();
    
    try {
      await fs.access(categoriesPath);
    } catch {
      // File doesn't exist, create it with default structure
      const defaultCategories: CategoryData[] = [];
      await this.writeCategories(defaultCategories);
    }
  }

  /**
   * Get categories file path
   */
  private getCategoriesFilePath(): string {
    // Use the existing .content directory structure
    return path.join(this.config.dataDir, this.config.categoriesFile);
  }

  /**
   * Get repository URL
   */
  private getRepositoryUrl(): string {
    return `https://github.com/${this.config.gitConfig.owner}/${this.config.gitConfig.repo}`;
  }

  /**
   * Get Git authentication
   */
  private getAuth() {
    return {
      username: 'x-access-token',
      password: this.config.gitConfig.token,
    };
  }

  /**
   * Get committer info
   */
  private getCommitter(committer: ICommitter = {}): ICommitter {
    return {
      email: committer.email || process.env.GIT_EMAIL || 'website@ever.works',
      name: committer.name || process.env.GIT_NAME || 'Website Bot',
    };
  }

  /**
   * Read categories from file
   */
  async readCategories(): Promise<CategoryData[]> {
    try {
      const categoriesPath = this.getCategoriesFilePath();
      const content = await fs.readFile(categoriesPath, 'utf-8');
      return yaml.parse(content) || [];
    } catch (error) {
      console.error('❌ Failed to read categories:', error);
      return [];
    }
  }

  /**
   * Write categories to file and push to GitHub
   */
  async writeCategories(categories: CategoryData[]): Promise<void> {
    try {
      const categoriesPath = this.getCategoriesFilePath();
      const content = yaml.stringify(categories);
      
      // Write to local file first (always succeed)
      await fs.writeFile(categoriesPath, content, 'utf-8');
      console.log('✅ Categories written to local file');
      
      try {
        // Try Git operations (may fail)
        // Add to git (using the .content directory as the git repo)
        await git.add({
          fs,
          dir: this.config.dataDir,
          filepath: this.config.categoriesFile,
        });
        
        // Commit changes
        const committer = this.getCommitter();
        await git.commit({
          fs,
          dir: this.config.dataDir,
          message: `Update categories - ${new Date().toISOString()}`,
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
        
        console.log('✅ Categories committed and pushed to GitHub successfully');
      } catch (gitError) {
        console.error('⚠️ Git operations failed, but local file was saved:', gitError);
        // Store pending changes for later sync
        this.pendingChanges = categories;
        // Try to sync in background
        this.scheduleBackgroundSync();
        // Don't throw error - local file was saved successfully
      }
    } catch (error) {
      console.error('❌ Failed to write categories:', error);
      throw error;
    }
  }

  /**
   * Create a new category
   */
  async createCategory(data: CreateCategoryRequest): Promise<CategoryData> {
    const categories = await this.readCategories();
    
    // Check for duplicate ID
    if (categories.find(cat => cat.id === data.id)) {
      throw new Error(`Category with ID "${data.id}" already exists`);
    }
    
    // Check for duplicate name
    if (categories.find(cat => cat.name.toLowerCase() === data.name?.toLowerCase())) {
      throw new Error(`Category with name "${data.name}" already exists`);
    }
    
    const newCategory: CategoryData = {
      id: data.id,
      name: data.name?.trim() || '',
    };
    
    categories.push(newCategory);
    await this.writeCategories(categories);
    
    return newCategory;
  }

  /**
   * Update an existing category
   */
  async updateCategory(data: UpdateCategoryRequest): Promise<CategoryData> {
    const categories = await this.readCategories();
    const categoryIndex = categories.findIndex(cat => cat.id === data.id);
    
    if (categoryIndex === -1) {
      throw new Error(`Category with ID "${data.id}" not found`);
    }
    
    // Check for duplicate name (excluding current category)
    if (categories.find(cat => 
      cat.id !== data.id && 
      cat.name.toLowerCase() === data.name?.toLowerCase()
    )) {
      throw new Error(`Category with name "${data.name}" already exists`);
    }
    
    const updatedCategory: CategoryData = {
      ...categories[categoryIndex],
      name: data.name?.trim() || categories[categoryIndex].name,
    };
    
    categories[categoryIndex] = updatedCategory;
    await this.writeCategories(categories);
    
    return updatedCategory;
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<void> {
    const categories = await this.readCategories();
    const filteredCategories = categories.filter(cat => cat.id !== id);
    
    if (filteredCategories.length === categories.length) {
      throw new Error(`Category with ID "${id}" not found`);
    }
    
    await this.writeCategories(filteredCategories);
  }

  /**
   * Create backup of categories
   */
  async createBackup(): Promise<void> {
    try {
      const categories = await this.readCategories();
      const backupPath = path.join(
        this.config.dataDir,
        `categories-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.yml`
      );
      
      await fs.writeFile(backupPath, yaml.stringify(categories), 'utf-8');
      console.log(`✅ Backup created: ${backupPath}`);
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * Get repository status
   */
  async getStatus(): Promise<{
    repoUrl: string;
    branch: string;
    lastSync: string;
    categoriesCount: number;
  }> {
    const categories = await this.readCategories();
    
    return {
      repoUrl: this.getRepositoryUrl(),
      branch: this.config.gitConfig.branch || 'main',
      lastSync: new Date().toISOString(),
      categoriesCount: categories.length,
    };
  }

  /**
   * Get Git status
   */
  async getGitStatus(): Promise<any> {
    try {
      return await git.statusMatrix({
        fs,
        dir: this.config.dataDir,
      });
    } catch (error) {
      console.error('❌ Failed to get Git status:', error);
      return [];
    }
  }

  /**
   * Schedule background sync for pending changes
   */
  private scheduleBackgroundSync(): void {
    if (this.syncInProgress) {
      return; // Already syncing
    }

    // Schedule sync after 30 seconds
    setTimeout(() => {
      this.performBackgroundSync();
    }, 30000);
  }

  /**
   * Perform background sync of pending changes
   */
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

  /**
   * Push pending changes to Git
   */
  private async pushPendingChanges(): Promise<void> {
    if (!this.pendingChanges) {
      return;
    }

    try {
      // Add to git
      await git.add({
        fs,
        dir: this.config.dataDir,
        filepath: this.config.categoriesFile,
      });
      
      // Commit changes
      const committer = this.getCommitter();
      await git.commit({
        fs,
        dir: this.config.dataDir,
        message: `Background sync: Update categories - ${new Date().toISOString()}`,
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

  /**
   * Get sync status including pending changes
   */
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

export async function createCategoryGitService(
  gitConfig: GitConfig,
  dataDir: string = './.content'
): Promise<CategoryGitService> {
  const service = new CategoryGitService({
    dataDir,
    categoriesFile: 'categories.yml',
    gitConfig,
  });
  
  await service.initialize();
  return service;
} 