import "server-only";
import yaml from "yaml";
import * as fs from "fs";
import * as path from "path";
import { CategoryData } from "@/lib/types/category";
import { getContentPath, fsExists } from "@/lib/lib";

/**
 * Service for handling file-based category operations
 * Follows Single Responsibility Principle - only handles file I/O
 */
export class CategoryFileService {
  private readonly contentPath: string;
  private readonly categoriesDir: string;
  private readonly categoriesFilePath: string;

  constructor() {
    this.contentPath = getContentPath();
    this.categoriesDir = path.join(this.contentPath, "categories");
    this.categoriesFilePath = path.join(this.contentPath, "categories.yml"); // Use existing categories.yml directly
  }

  /**
   * Reads categories from YAML file
   * @param lang - Optional language for translations
   * @returns Array of categories
   */
  async readCategories(lang?: string): Promise<CategoryData[]> {
    try {
      // Read from existing categories.yml
      const categories = await this.readCategoriesFromFile();
      
      // Apply translations if requested
      if (lang && lang !== "en") {
        return await this.applyTranslations(categories, lang);
      }

      return categories;
    } catch (error) {
      if (this.isFileNotFoundError(error)) {
        // Return empty array if file doesn't exist
        return [];
      }
      throw new Error(`Failed to read categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Writes categories to YAML file
   * @param categories - Categories to write
   */
  async writeCategories(categories: CategoryData[]): Promise<void> {
    try {
      const yamlContent = yaml.stringify(categories, {
        indent: 2,
        lineWidth: 0, // Disable line wrapping
        minContentWidth: 0,
      });

      await fs.promises.writeFile(this.categoriesFilePath, yamlContent, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Checks if categories file exists
   */
  async categoriesFileExists(): Promise<boolean> {
    return await fsExists(this.categoriesFilePath);
  }

  /**
   * Creates a backup of the current categories file
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.contentPath, `categories.backup.${timestamp}.yml`);
    
    if (await this.categoriesFileExists()) {
      await fs.promises.copyFile(this.categoriesFilePath, backupPath);
    }
    
    return backupPath;
  }

  private async readCategoriesFromFile(): Promise<CategoryData[]> {
    // Read from existing categories.yml in content root
    if (await this.categoriesFileExists()) {
      const content = await fs.promises.readFile(this.categoriesFilePath, 'utf8');
      const categories = yaml.parse(content) as CategoryData[];
      return Array.isArray(categories) ? categories : [];
    }

    return [];
  }

  private async applyTranslations(categories: CategoryData[], lang: string): Promise<CategoryData[]> {
    try {
      const translationPath = path.join(this.contentPath, `categories.${lang}.yml`);
      
      if (await fsExists(translationPath)) {
        const content = await fs.promises.readFile(translationPath, 'utf8');
        const translations = yaml.parse(content) as CategoryData[];
        
        if (Array.isArray(translations)) {
          return categories.map(category => {
            const translation = translations.find(t => t.id === category.id);
            return translation ? { ...category, ...translation } : category;
          });
        }
      }
    } catch (error) {
      // Log error but don't fail - just return original categories
      console.warn(`Failed to apply translations for language ${lang}:`, error);
    }

    return categories;
  }

  private isFileNotFoundError(error: unknown): boolean {
    return error instanceof Error && 
           'code' in error && 
           error.code === 'ENOENT';
  }
}

/**
 * Singleton instance
 */
export const categoryFileService = new CategoryFileService(); 