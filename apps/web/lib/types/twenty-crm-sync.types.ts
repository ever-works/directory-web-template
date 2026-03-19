/**
 * Twenty CRM Sync Operations Types
 * Type definitions for upsert operations and sync-related functionality
 */

/**
 * Result of an upsert operation
 * Generic type that wraps the entity data with metadata
 */
export interface UpsertResult<T> {
  /**
   * CRM ID (UUID) assigned by Twenty CRM
   */
  id: string;

  /**
   * External ID from our system (for reference)
   */
  externalId: string;

  /**
   * Whether a new record was created (true) or existing record was updated (false)
   */
  created: boolean;

  /**
   * Whether the record was updated (true for both create and update operations)
   */
  updated: boolean;

  /**
   * The full entity data as returned by the CRM
   */
  data: T;
}

/**
 * Input for upserting a company
 * Subset of TwentyCompany fields required for upsert operations
 */
export interface UpsertCompanyInput {
  /**
   * External ID - maps to local company.id
   * Required for idempotency
   */
  external_id: string;

  /**
   * Company name (required)
   */
  name: string;

  /**
   * Domain name (e.g., example.com) - optional
   */
  domain_name?: string | null;

  /**
   * Company website URL (optional)
   */
  website?: string | null;

  /**
   * Company status (optional)
   * Values: active, inactive
   */
  status?: string | null;
}

/**
 * Input for upserting a person
 * Subset of TwentyPerson fields required for upsert operations
 */
export interface UpsertPersonInput {
  /**
   * External ID - maps to local clientProfile.id
   * Required for idempotency
   */
  external_id: string;

  /**
   * Full name of the person (required)
   */
  name: string;

  /**
   * Primary email address (required)
   */
  email: string;

  /**
   * Phone number (optional)
   */
  phone?: string | null;

  /**
   * Job title/position (optional)
   */
  job_title?: string | null;

  /**
   * Company name (optional)
   */
  company_name?: string | null;

  /**
   * Website URL (optional)
   */
  website?: string | null;

  /**
   * City/location (optional)
   */
  city?: string | null;

  /**
   * Account type - custom field for submission context
   * Values: individual, business, enterprise
   */
  account_type?: string | null;

  /**
   * Subscription plan - custom field for submission context
   * Values: free, standard, premium
   */
  plan?: string | null;

  /**
   * Total number of submissions - custom field for submission context
   */
  total_submissions?: number | null;

  /**
   * External ID of the company to link this person to (optional)
   * If provided, will attempt to find or create company first
   */
  company_external_id?: string | null;
}

/**
 * Cache entry for external_id to CRM ID mappings
 * Used to reduce GET requests during sync operations
 */
export interface CacheEntry {
  /**
   * CRM ID (UUID) from Twenty CRM
   */
  crmId: string;

  /**
   * External ID from our system
   */
  externalId: string;

  /**
   * Timestamp when this entry was cached (ms since epoch)
   */
  cachedAt: number;
}

/**
 * Cache entry specifically for Person entities
 */
export interface PersonCacheEntry extends CacheEntry {
  /**
   * Entity type discriminator
   */
  type: 'person';
}

/**
 * Cache entry specifically for Company entities
 */
export interface CompanyCacheEntry extends CacheEntry {
  /**
   * Entity type discriminator
   */
  type: 'company';
}

/**
 * Union type for all cache entry types
 */
export type AnyCacheEntry = PersonCacheEntry | CompanyCacheEntry;

/**
 * Options for upsert operations
 */
export interface UpsertOptions {
  /**
   * Whether to use cache for lookups
   * Default: true
   */
  useCache?: boolean;

  /**
   * Maximum number of retry attempts for 409 conflicts
   * Default: 3
   */
  maxConflictRetries?: number;

  /**
   * Delay between conflict retry attempts (ms)
   * Default: 100
   */
  conflictRetryDelay?: number;
}
