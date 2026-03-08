// ######################### Category Types for File-Based System #########################

export interface CategoryData {
  id: string;
  name: string;
}

export interface CategoryWithCount extends CategoryData {
  count?: number;
  isInactive?: boolean;
}

export interface CreateCategoryRequest {
  id: string;
  name: string;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}

export interface CategoryListResponse {
  categories: CategoryWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CategoryResponse {
  success: boolean;
  category?: CategoryData;
  error?: string;
}

export interface CategoryListOptions {
  includeInactive?: boolean;
  sortBy?: 'name' | 'id';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Validation schemas
export const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const; 