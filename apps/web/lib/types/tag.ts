// ######################### Tag Types for File-Based System #########################

export interface TagData {
  id: string;
  name: string;
  isActive: boolean;
}

export interface TagWithCount extends TagData {
  count?: number;
}

export interface CreateTagRequest {
  id: string;
  name: string;
  isActive: boolean;
}

export type UpdateTagRequest = Partial<Omit<CreateTagRequest, 'id'>>;

export interface TagListResponse {
  tags: TagWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TagResponse {
  success: boolean;
  tag?: TagData;
  error?: string;
}

export interface TagListOptions {
  includeInactive?: boolean;
  sortBy?: 'name' | 'id';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Validation schemas
export const TAG_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const; 