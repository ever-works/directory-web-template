/**
 * Collection type representing a curated group of items organized by theme
 */
export interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_url?: string;
  item_count: number;
  items?: string[]; // Array of item IDs assigned to this collection
  isActive: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCollectionRequest {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  icon_url?: string;
  isActive?: boolean;
}

export interface UpdateCollectionRequest extends Partial<CreateCollectionRequest> {
  id: string;
  item_count?: number;
  items?: string[];
}

export interface AssignCollectionItemsRequest {
  itemIds: string[];
}

export interface CollectionListOptions {
  includeInactive?: boolean;
  search?: string;
  sortBy?: 'name' | 'item_count' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * API response type for collections list
 */
export interface CollectionsResponse {
  collections: Collection[];
  total: number;
}

/**
 * API response type for single collection with items
 */
export interface CollectionDetailResponse {
  collection: Collection;
  items: any[]; // Using any[] for now, should match your Item type
  total: number;
}

export const COLLECTION_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ID_MIN_LENGTH: 3,
  ID_MAX_LENGTH: 50,
} as const;
