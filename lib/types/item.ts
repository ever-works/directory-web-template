/**
 * Location data for items that can be geocoded.
 * This data is stored in YAML and indexed in item_location_index for fast geo queries.
 */
export interface ItemLocationData {
  address?: string; // Full address string for geocoding
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number; // Pre-geocoded latitude (optional)
  longitude?: number; // Pre-geocoded longitude (optional)
  service_area?: string; // Service area description (e.g., "Nationwide", "New York Metro")
  is_remote?: boolean; // Whether this item operates remotely/virtually
}

export interface ItemData {
  id: string;
  name: string;
  slug: string;
  description: string;
  source_url: string;
  category: string | string[];
  tags: string[];
  collections?: string[];
  featured?: boolean;
  icon_url?: string;
  updated_at: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_by?: string;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  deleted_at?: string; // ISO timestamp for soft delete
  action?: 'visit-website' | 'start-survey' | 'buy'; // CTA action type
  showSurveys?: boolean; // Whether to show surveys section (default: true)
  publisher?: string; // Publisher name for display
  // Location fields
  location?: ItemLocationData;
}

export interface CreateItemRequest {
  id: string;
  name: string;
  slug: string;
  description: string;
  source_url: string;
  category: string | string[];
  tags: string[];
  collections?: string[];
  brand?: string;
  featured?: boolean;
  icon_url?: string;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_by?: string;
  location?: ItemLocationData;
}

export interface UpdateItemRequest extends Partial<CreateItemRequest> {
  id: string;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  deleted_at?: string; // For soft delete operations
}

// Sorting types for item lists
export type SortField = 'name' | 'updated_at' | 'status' | 'submitted_at';
export type SortOrder = 'asc' | 'desc';

export interface ItemListOptions {
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  categories?: string[]; // Changed from single category to array for multi-category filtering
  tags?: string[]; // Changed from single tag to array for multi-tag filtering
  page?: number;
  limit?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  includeDeleted?: boolean; // Include soft-deleted items (default: false)
  submittedBy?: string; // Filter by user who submitted
  search?: string; // Search by name or description
  // Location-based filtering
  city?: string; // Filter by city
  country?: string; // Filter by country
  includeRemote?: boolean; // Include remote items in location queries
}

export interface ItemListResponse {
  items: ItemData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ItemResponse {
  success: boolean;
  item?: ItemData;
  error?: string;
  message?: string;
}

export interface ReviewRequest {
  status: 'approved' | 'rejected';
  review_notes?: string;
}

// Validation constants
export const ITEM_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 500,
  SLUG_MIN_LENGTH: 3,
  SLUG_MAX_LENGTH: 50,
} as const;

// Status options for the approval flow
export const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

// Type alias for item status literals
export type ItemStatus = (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];

export const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;

export const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const; 