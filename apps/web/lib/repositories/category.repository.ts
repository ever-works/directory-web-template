import "server-only";
import {
  CategoryData,
  CategoryWithCount,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryListOptions,
  CATEGORY_VALIDATION
} from "@/lib/types/category";
import { createCategoryGitService } from "@/lib/services/category-git.service";
import { coreConfig } from "@/lib/config/config-service";

/**
 * Repository for category business logic operations
 * Follows Repository Pattern and Single Responsibility Principle
 */
export class CategoryRepository {
  private gitService: any = null;

  private async getGitService() {
    if (!this.gitService) {
      // Parse DATA_REPOSITORY URL to extract owner and repo
      const dataRepo = coreConfig.content.dataRepository;
      if (!dataRepo) {
        throw new Error('DATA_REPOSITORY not configured. Please set DATA_REPOSITORY environment variable.');
      }

      // Extract owner and repo from URL like: https://github.com/ever-co/awesome-time-tracking-data
      const match = dataRepo.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        throw new Error('Invalid DATA_REPOSITORY format. Expected: https://github.com/owner/repo');
      }

      const [, owner, repo] = match;
      const gitConfig = {
        owner,
        repo,
        token: coreConfig.content.ghToken || '',
        branch: coreConfig.content.githubBranch || 'main',
      };

      if (!gitConfig.token) {
        throw new Error('GitHub token not configured. Please set GH_TOKEN environment variable.');
      }

      this.gitService = await createCategoryGitService(gitConfig);
    }
    return this.gitService;
  }
  
  /**
   * Get all categories with optional filtering and sorting
   */
  async findAll(options: CategoryListOptions = {}): Promise<CategoryWithCount[]> {
    const gitService = await this.getGitService();
    const categories = await gitService.readCategories();
    
    let filteredCategories = categories;

    // All categories are considered active since we removed isActive field
    // This filter is kept for backward compatibility but always returns all categories
    if (!options.includeInactive) {
      filteredCategories = categories; // All categories are active
    }

    // Sort categories
    filteredCategories = this.sortCategories(filteredCategories, options);

    return filteredCategories;
  }

  /**
   * Find all categories with pagination
   */
  async findAllPaginated(options: CategoryListOptions = {}): Promise<{
    categories: CategoryWithCount[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, ...filterOptions } = options;
    
    // Get all filtered and sorted categories
    const allCategories = await this.findAll(filterOptions);
    const total = allCategories.length;
    
    // Calculate pagination
    const offset = (page - 1) * limit;
    const paginatedCategories = allCategories.slice(offset, offset + limit);
    const totalPages = Math.ceil(total / limit);
    
    return {
      categories: paginatedCategories,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Find category by ID
   */
  async findById(id: string): Promise<CategoryData | null> {
    const gitService = await this.getGitService();
    const categories = await gitService.readCategories();
    return categories.find((cat: CategoryData) => cat.id === id) || null;
  }

  /**
   * Find category by slug (using ID as slug for now)
   */
  async findBySlug(slug: string): Promise<CategoryData | null> {
    return this.findById(slug);
  }

  /**
   * Create a new category
   */
  async create(data: CreateCategoryRequest): Promise<CategoryData> {
    // Validate input
    this.validateCategoryData(data);

    // Check for duplicate names
    await this.checkDuplicateName(data.name);

    // Use Git service to create category
    const gitService = await this.getGitService();
    return await gitService.createCategory(data);
  }

  /**
   * Update an existing category
   */
  async update(data: UpdateCategoryRequest): Promise<CategoryData> {
    // Validate input
    this.validateUpdateData(data);

    // Check for duplicate name if name is being changed
    if (data.name) {
      await this.checkDuplicateName(data.name, data.id);
    }

    // Use Git service to update category
    const gitService = await this.getGitService();
    return await gitService.updateCategory(data);
  }

  /**
   * Delete a category (hard delete since we removed isActive)
   */
  async delete(id: string): Promise<void> {
    // Since we removed isActive, we'll do a hard delete
    await this.hardDelete(id);
  }

  /**
   * Hard delete a category (remove from Git repository)
   */
  async hardDelete(id: string): Promise<void> {
    const gitService = await this.getGitService();
    await gitService.deleteCategory(id);
  }

  /**
   * Reorder categories (simplified - just reorder by name for now)
   */
  async reorder(categoryIds: string[]): Promise<void> {
    const gitService = await this.getGitService();
    const categories = await gitService.readCategories();
    
    // Reorder categories based on the provided IDs
    const reorderedCategories = categoryIds
      .map(id => categories.find((cat: CategoryData) => cat.id === id))
      .filter(Boolean) as CategoryData[];

    // Add any remaining categories that weren't in the reorder list
    const remainingCategories = categories.filter((cat: CategoryData) => !categoryIds.includes(cat.id));
    reorderedCategories.push(...remainingCategories);

    // Write reordered categories back to Git
    await gitService.writeCategories(reorderedCategories);
  }

  /**
   * Private helper methods
   */
  private validateCategoryData(data: CreateCategoryRequest): void {
    if (!data.name || data.name.trim().length < CATEGORY_VALIDATION.NAME_MIN_LENGTH) {
      throw new Error(`Category name must be at least ${CATEGORY_VALIDATION.NAME_MIN_LENGTH} characters long`);
    }

    if (data.name.trim().length > CATEGORY_VALIDATION.NAME_MAX_LENGTH) {
      throw new Error(`Category name must be no more than ${CATEGORY_VALIDATION.NAME_MAX_LENGTH} characters long`);
    }

    if (!data.id || data.id.trim().length < 3) {
      throw new Error('Category ID must be at least 3 characters long');
    }

    if (data.id.trim().length > 50) {
      throw new Error('Category ID must be no more than 50 characters long');
    }

    if (!/^[a-z0-9-]+$/.test(data.id.trim())) {
      throw new Error('Category ID must contain only lowercase letters, numbers, and hyphens');
    }
  }

  private validateUpdateData(data: UpdateCategoryRequest): void {
    if (!data.id) {
      throw new Error('Category ID is required for updates');
    }

    // Validate name if provided
    if (data.name !== undefined) {
      if (data.name.trim().length < CATEGORY_VALIDATION.NAME_MIN_LENGTH) {
        throw new Error(`Category name must be at least ${CATEGORY_VALIDATION.NAME_MIN_LENGTH} characters long`);
      }

      if (data.name.trim().length > CATEGORY_VALIDATION.NAME_MAX_LENGTH) {
        throw new Error(`Category name must be no more than ${CATEGORY_VALIDATION.NAME_MAX_LENGTH} characters long`);
      }
    }
  }

  private async checkDuplicateName(name: string, excludeId?: string): Promise<void> {
    const gitService = await this.getGitService();
    const categories = await gitService.readCategories();
    const duplicate = categories.find((cat: CategoryData) => 
      cat.name.toLowerCase() === name.toLowerCase() && 
      cat.id !== excludeId
    );
    
    if (duplicate) {
      throw new Error(`Category with name "${name}" already exists`);
    }
  }

  private sortCategories(categories: CategoryData[], options: CategoryListOptions): CategoryData[] {
    const { sortBy = 'name', sortOrder = 'asc' } = options;

    return categories.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
        default:
          comparison = a.name.localeCompare(b.name);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }
}

/**
 * Singleton instance
 */
export const categoryRepository = new CategoryRepository(); 