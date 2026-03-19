import "server-only";
import yaml from "yaml";
import * as fs from "fs";
import * as path from "path";
import { getContentPath, fsExists } from "@/lib/lib";

// Logger utility
const logger = {
  warn: (message: string, context?: Record<string, any>) =>
    console.warn(`[FileService] ${message}`, context || ''),
  error: (message: string, context?: Record<string, any>) =>
    console.error(`[FileService] ${message}`, context || ''),
};

/**
 * Generic interface for data that can be stored in YAML files
 */
export interface YamlData {
  id: string;
  [key: string]: any;
}

/**
 * Configuration options for the DynamicFileService
 */
export interface FileServiceConfig {
  /** Base directory for files (default: content directory) */
  baseDir?: string;
  /** File extension (default: '.yml') */
  extension?: string;
  /** Whether to create backups automatically */
  createBackups?: boolean;
  /** Custom backup directory */
  backupDir?: string;
  /** YAML stringify options */
  yamlOptions?: {
    indent?: number;
    lineWidth?: number;
    minContentWidth?: number;
  };
}

/**
 * Generic service for handling YAML file operations
 * Follows Single Responsibility Principle and DRY principles
 * Can be used for any type of data that needs file-based persistence
 */
export class FileService<T extends YamlData> {
  private readonly baseDir: string;
  private readonly extension: string;
  private readonly createBackups: boolean;
  private readonly backupDir: string;
  private readonly yamlOptions: Required<NonNullable<FileServiceConfig['yamlOptions']>>;

  constructor(
    private readonly fileName: string,
    private readonly config: FileServiceConfig = {}
  ) {
    this.baseDir = config.baseDir || getContentPath();
    this.extension = config.extension || '.yml';
    this.createBackups = config.createBackups ?? true;
    this.backupDir = config.backupDir || path.join(this.baseDir, 'backups');
    this.yamlOptions = {
      indent: 2,
      lineWidth: 0,
      minContentWidth: 0,
      ...config.yamlOptions
    };
  }

  /**
   * Get the full file path
   */
  get filePath(): string {
    const safeName = path.basename(this.fileName);
    return path.join(this.baseDir, `${safeName}${this.extension}`);
  }

  /**
   * Get the backup file path
   */
  private getBackupPath(timestamp?: string): string {
    const ts = timestamp || new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = path.basename(this.fileName);
    return path.join(this.backupDir, `${safeName}.backup.${ts}${this.extension}`);
  }

  /**
   * Read data from YAML file
   * @param lang - Optional language for translations
   * @returns Array of data items
   */
  async read(lang?: string): Promise<T[]> {
    try {
      const data = await this.readFromFile();
      // Apply translations if requested
      if (lang && lang !== "en") {
        return await this.applyTranslations(data, lang);
      }
      return data;
    } catch (error) {
      if (this.isFileNotFoundError(error)) {
        return [];
      }
      throw new Error(`Failed to read ${this.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Write data to YAML file
   * @param data - Data to write
   * @param createBackup - Whether to create a backup before writing
   */
  async write(data: T[], createBackup: boolean = this.createBackups): Promise<void> {
    try {
      // Create backup if requested
      if (createBackup && await this.fileExists()) {
        await this.createBackup();
      }

      // Ensure directory exists before writing
      await this.ensureDirectoryExists();

      const yamlContent = yaml.stringify(data, this.yamlOptions);
      await fs.promises.writeFile(this.filePath, yamlContent, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write ${this.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Append data to existing file
   * @param newData - New data to append
   * @param createBackup - Whether to create a backup before appending
   */
  async append(newData: T[], createBackup: boolean = this.createBackups): Promise<void> {
    const existingData = await this.read();
    const combinedData = [...existingData, ...newData];
    await this.write(combinedData, createBackup);
  }

  /**
   * Add a single item to the existing list
   * @xparam item - Item to add
   * @param createBackup - Whether to create a backup before adding
   */
  async addItem(item: T, createBackup: boolean = this.createBackups): Promise<void> {
    const existingData = await this.read();
    
    // Check if item with same ID already exists
    const existingIndex = existingData.findIndex(existingItem => existingItem.id === item.id);
    
    if (existingIndex !== -1) {
      // Update existing item instead of adding duplicate
      existingData[existingIndex] = { ...existingData[existingIndex], ...item };
    } else {
      // Add new item
      existingData.push(item);
    }
    
    await this.write(existingData, createBackup);
  }

  /**
   * Add multiple items to the existing list
   * @param items - Items to add
   * @param createBackup - Whether to create a backup before adding
   * @param skipDuplicates - Whether to skip items that already exist (by ID)
   */
  async addItems(
    items: T[], 
    createBackup: boolean = this.createBackups,
    skipDuplicates: boolean = false
  ): Promise<{ added: number; updated: number; skipped: number }> {
    const existingData = await this.read();
    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of items) {
      const existingIndex = existingData.findIndex(existingItem => existingItem.id === item.id);
      
      if (existingIndex !== -1) {
        if (skipDuplicates) {
          skipped++;
        } else {
          // Update existing item
          existingData[existingIndex] = { ...existingData[existingIndex], ...item };
          updated++;
        }
      } else {
        // Add new item
        existingData.push(item);
        added++;
      }
    }

    await this.write(existingData, createBackup);
    
    return { added, updated, skipped };
  }

  /**
   * Add an item at a specific position in the list
   * @param item - Item to add
   * @param position - Position to insert at (0-based index)
   * @param createBackup - Whether to create a backup before adding
   */
  async addItemAt(item: T, position: number, createBackup: boolean = this.createBackups): Promise<void> {
    const existingData = await this.read();
    
    
    // Check if item with same ID already exists
    const existingIndex = existingData.findIndex(existingItem => existingItem.id === item.id);
    
    if (existingIndex !== -1) {
      // Remove existing item first
      existingData.splice(existingIndex, 1);
    }
    
    // Insert at specified position
    const insertPosition = Math.max(0, Math.min(position, existingData.length));
    existingData.splice(insertPosition, 0, item);
    
    await this.write(existingData, createBackup);
  }

  /**
   * Add an item to the beginning of the list
   * @param item - Item to add
   * @param createBackup - Whether to create a backup before adding
   */
  async addItemFirst(item: T, createBackup: boolean = this.createBackups): Promise<void> {
    await this.addItemAt(item, 0, createBackup);
  }

  /**
   * Add an item to the end of the list
   * @param item - Item to add
   * @param createBackup - Whether to create a backup before adding
   */
  async addItemLast(item: T, createBackup: boolean = this.createBackups): Promise<void> {
    const existingData = await this.read();
    await this.addItemAt(item, existingData.length, createBackup);
  }

  /**
   * Add an item after another item (by ID)
   * @param item - Item to add
   * @param afterId - ID of the item to add after
   * @param createBackup - Whether to create a backup before adding
   */
  async addItemAfter(item: T, afterId: string, createBackup: boolean = this.createBackups): Promise<boolean> {
    const existingData = await this.read();
    const afterIndex = existingData.findIndex(existingItem => existingItem.id === afterId);
    
    if (afterIndex === -1) {
      return false; // Item not found
    }
    
    await this.addItemAt(item, afterIndex + 1, createBackup);
    return true;
  }

  /**
   * Add an item before another item (by ID)
   * @param item - Item to add
   * @param beforeId - ID of the item to add before
   * @param createBackup - Whether to create a backup before adding
   */
  async addItemBefore(item: T, beforeId: string, createBackup: boolean = this.createBackups): Promise<boolean> {
    const existingData = await this.read();
    const beforeIndex = existingData.findIndex(existingItem => existingItem.id === beforeId);
    
    if (beforeIndex === -1) {
      return false; // Item not found
    }
    
    await this.addItemAt(item, beforeIndex, createBackup);
    return true;
  }

  /**
   * Add items only if file exists, without creating new file or overwriting existing data
   * @param items - Items to add
   * @param createBackup - Whether to create a backup before adding
   */
  async addItemsIfFileExists(
    items: T[], 
    createBackup: boolean = this.createBackups
  ): Promise<{ added: number; skipped: number; fileNotFound: boolean }> {
    // Check if file exists first
    if (!(await this.fileExists())) {
      return { added: 0, skipped: 0, fileNotFound: true };
    }

    const existingData = await this.read();
    let added = 0;
    let skipped = 0;

    for (const item of items) {
      const existingIndex = existingData.findIndex(existingItem => existingItem.id === item.id);
      
      if (existingIndex !== -1) {
        // Skip if item already exists (don't overwrite)
        skipped++;
      } else {
        // Add new item
        existingData.push(item);
        added++;
      }
    }

    // Only write if there are new items to add
    if (added > 0) {
      await this.write(existingData, createBackup);
    }
    
    return { added, skipped, fileNotFound: false };
  }

  /**
   * Add content to existing file without any duplicate checking
   * Simply appends new data to existing data
   * @param items - Items to add
   * @param createBackup - Whether to create a backup before adding
   */
  async addContentToExistingFile(
    items: T[], 
    createBackup: boolean = this.createBackups
  ): Promise<{ added: number; fileNotFound: boolean }> {
    // Check if file exists first
    if (!(await this.fileExists())) {
      return { added: 0, fileNotFound: true };
    }

    const existingData = await this.read();
    
    // Ensure existingData is an array
    const dataArray = Array.isArray(existingData) ? existingData : [];
    
    // Simply append all new items to existing data
    dataArray.push(...items);
    
    // Write the combined data
    await this.write(dataArray, createBackup);
    
    return { added: items.length, fileNotFound: false };
  }

  /**
   * Update specific item by ID
   * @param id - ID of the item to update
   * @param updatedData - Updated data
   * @param createBackup - Whether to create a backup before updating
   */
  async updateById(id: string, updatedData: Partial<T>, createBackup: boolean = this.createBackups): Promise<T | null> {
    const data = await this.read();
    const index = data.findIndex(item => item.id === id);
    
    if (index === -1) {
      return null;
    }

    if (createBackup) {
      await this.createBackup();
    }

    data[index] = { ...data[index], ...updatedData };
    await this.write(data, false);
    
    return data[index];
  }

  /**
   * Delete item by ID
   * @param id - ID of the item to delete
   * @param createBackup - Whether to create a backup before deleting
   */
  async deleteById(id: string, createBackup: boolean = this.createBackups): Promise<boolean> {
    const data = await this.read();
    const filteredData = data.filter(item => item.id !== id);
    
    if (data.length === filteredData.length) {
      return false; // Item not found
    }

    if (createBackup) {
      await this.createBackup();
    }

    await this.write(filteredData, false);
    return true;
  }

  /**
   * Find item by ID
   * @param id - ID to search for
   */
  async findById(id: string): Promise<T | null> {
    const data = await this.read();
    return data.find(item => item.id === id) || null;
  }

  /**
   * Find items by criteria
   * @param criteria - Search criteria
   */
  async findBy(criteria: Partial<T>): Promise<T[]> {
    const data = await this.read();
    return data.filter(item => 
      Object.entries(criteria).every(([key, value]) => item[key] === value)
    );
  }

  /**
   * Check if file exists
   */
  async fileExists(): Promise<boolean> {
    return await fsExists(this.filePath);
  }

  /**
   * Create a backup of the current file
   * @param customTimestamp - Custom timestamp for backup filename
   */
  async createBackup(customTimestamp?: string): Promise<string> {
    const backupPath = this.getBackupPath(customTimestamp);
    
    // Ensure backup directory exists
    await this.ensureBackupDirectoryExists();
    
    if (await this.fileExists()) {
      await fs.promises.copyFile(this.filePath, backupPath);
    }
    
    return backupPath;
  }

  /**
   * Get file statistics
   */
  async getStats(): Promise<{ size: number; lastModified: Date; itemCount: number }> {
    const stats = await fs.promises.stat(this.filePath);
    const data = await this.read();
    
    return {
      size: stats.size,
      lastModified: stats.mtime,
      itemCount: data.length
    };
  }

  /**
   * Clear all data (empty the file)
   * @param createBackup - Whether to create a backup before clearing
   */
  async clear(createBackup: boolean = this.createBackups): Promise<void> {
    if (createBackup) {
      await this.createBackup();
    }
    await this.write([], false);
  }

  /**
   * Read data from file
   */
  private async readFromFile(): Promise<T[]> {
    if (await this.fileExists()) {
      const content = await fs.promises.readFile(this.filePath, 'utf8');
      const data = yaml.parse(content) as T[];
      return data || [];
    }
    return [];
  }

  /**
   * Apply translations for specific language
   */
  private async applyTranslations(data: T[], lang: string): Promise<T[]> {
    try {
      const safeName = path.basename(this.fileName);
      const translationPath = path.join(this.baseDir, `${safeName}.${lang}${this.extension}`);
      
      if (await fsExists(translationPath)) {
        const content = await fs.promises.readFile(translationPath, 'utf8');
        const translations = yaml.parse(content) as T[];
        
        if (Array.isArray(translations)) {
          return data.map(item => {
            const translation = translations.find(t => t.id === item.id);
            return translation ? { ...item, ...translation } : item;
          });
        }
      }
    } catch (error) {
      logger.warn(`Failed to apply translations for language ${lang}:`, { error });
    }

    return data;
  }

  /**
   * Ensure the directory for the file exists
   */
  private async ensureDirectoryExists(): Promise<void> {
    const dirPath = path.dirname(this.filePath);
    await fs.promises.mkdir(dirPath, { recursive: true });
  }

  /**
   * Ensure the backup directory exists
   */
  private async ensureBackupDirectoryExists(): Promise<void> {
    await fs.promises.mkdir(this.backupDir, { recursive: true });
  }

  /**
   * Create directory structure for the service
   * @param createBackupDir - Whether to also create backup directory
   */
  async createDirectories(createBackupDir: boolean = true): Promise<void> {
    await this.ensureDirectoryExists();
    
    if (createBackupDir) {
      await this.ensureBackupDirectoryExists();
    }
  }

  /**
   * Check if the base directory exists
   */
  async baseDirectoryExists(): Promise<boolean> {
    try {
      const stat = await fs.promises.stat(this.baseDir);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if the backup directory exists
   */
  async backupDirectoryExists(): Promise<boolean> {
    try {
      const stat = await fs.promises.stat(this.backupDir);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get directory information
   */
  async getDirectoryInfo(): Promise<{
    baseDir: string;
    backupDir: string;
    baseDirExists: boolean;
    backupDirExists: boolean;
    filePath: string;
    fileExists: boolean;
  }> {
    return {
      baseDir: this.baseDir,
      backupDir: this.backupDir,
      baseDirExists: await this.baseDirectoryExists(),
      backupDirExists: await this.backupDirectoryExists(),
      filePath: this.filePath,
      fileExists: await this.fileExists(),
    };
  }

  /**
   * Check if error is file not found
   */
  private isFileNotFoundError(error: unknown): boolean {
    return error instanceof Error && 
           'code' in error && 
           error.code === 'ENOENT';
  }
}

/**
 * Factory function to create file services for different data types
 */
export function createFileService<T extends YamlData>(
  fileName: string,
  config?: FileServiceConfig
): FileService<T> {
  return new FileService<T>(fileName, config);
}

/**
 * Pre-configured services for common use cases
 */
export const fileServices = {
  config: () => createFileService('config'),
} as const;
