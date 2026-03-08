/**
 * Twenty CRM Entity Types
 * Type definitions for Twenty CRM API entities (Person, Company)
 * Based on standard CRM field naming conventions
 */

/**
 * Twenty CRM Person (Contact) entity
 * Represents a contact/person in Twenty CRM
 */
export interface TwentyPerson {
  /**
   * External ID - maps to local clientProfile.id
   * Required for idempotency and cross-system reference
   */
  external_id: string;

  /**
   * Full name of the person
   */
  name: string;

  /**
   * Primary email address
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
}

/**
 * Twenty CRM Company entity
 * Represents a company/organization in Twenty CRM
 */
export interface TwentyCompany {
  /**
   * External ID - maps to local company.id
   * Required for idempotency and cross-system reference
   */
  external_id: string;

  /**
   * Company name
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
