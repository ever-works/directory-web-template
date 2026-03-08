/**
 * Twenty CRM Mappers
 * Pure, side-effect-free functions to convert local data to Twenty CRM payloads
 */

import type { ClientProfile } from '@/lib/db/schema';
import type { TwentyPerson, TwentyCompany } from '@/lib/types/twenty-crm-entities.types';

/**
 * Company type from feat/create-companies branch
 * TODO: Import from schema once branch is merged
 */
interface Company {
  id: string;
  name: string;
  website: string | null;
  domain: string | null;
  slug: string | null;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Ensures external_id is always present and valid
 * Throws error if ID is missing or empty
 *
 * @param id - Local entity ID
 * @param entityType - Type of entity (for error messages)
 * @returns Validated external_id
 * @throws Error if ID is missing or empty
 */
export function ensureExternalId(id: string | undefined | null, entityType: string): string {
  if (!id || id.trim() === '') {
    throw new Error(`${entityType} ID is required for external_id mapping`);
  }
  return id.trim();
}

/**
 * Extracts city from location string
 * Handles various formats: "City", "City, State", "City, State, Country"
 *
 * @param location - Location string (e.g., "San Francisco, CA, USA")
 * @returns City name or null if cannot be extracted
 */
export function extractCityFromLocation(location: string | undefined | null): string | null {
  if (!location || location.trim() === '') {
    return null;
  }

  // Split by comma and take first part as city
  const parts = location.split(',');
  const city = parts[0]?.trim();

  return city || null;
}

/**
 * Maps ClientProfile to Twenty CRM Person payload
 * Pure function - no side effects, no mutations, null-safe
 *
 * @param clientProfile - Local client profile data
 * @returns Twenty CRM Person payload
 * @throws Error if required fields are missing
 */
export function mapClientProfileToPerson(clientProfile: ClientProfile): TwentyPerson {
  // Ensure external_id is always present
  const external_id = ensureExternalId(clientProfile.id, 'ClientProfile');

  // Map core fields (required)
  const person: TwentyPerson = {
    external_id,
    name: clientProfile.name,
    email: clientProfile.email,
  };

  // Map optional fields (null-safe with optional chaining)
  if (clientProfile.phone) {
    person.phone = clientProfile.phone;
  }

  if (clientProfile.jobTitle) {
    person.job_title = clientProfile.jobTitle;
  }

  if (clientProfile.company) {
    person.company_name = clientProfile.company;
  }

  if (clientProfile.website) {
    person.website = clientProfile.website;
  }

  // Extract city from location string
  const city = extractCityFromLocation(clientProfile.location);
  if (city) {
    person.city = city;
  }

  // Include submission context (custom fields)
  if (clientProfile.accountType) {
    person.account_type = clientProfile.accountType;
  }

  if (clientProfile.plan) {
    person.plan = clientProfile.plan;
  }

  if (clientProfile.totalSubmissions !== null && clientProfile.totalSubmissions !== undefined) {
    person.total_submissions = clientProfile.totalSubmissions;
  }

  return person;
}

/**
 * Maps Company to Twenty CRM Company payload
 * Pure function - no side effects, no mutations, null-safe
 *
 * @param company - Local company data
 * @returns Twenty CRM Company payload
 * @throws Error if required fields are missing
 */
export function mapCompanyToTwentyCompany(company: Company): TwentyCompany {
  // Ensure external_id is always present
  const external_id = ensureExternalId(company.id, 'Company');

  // Map core fields (required)
  const twentyCompany: TwentyCompany = {
    external_id,
    name: company.name,
  };

  // Map optional fields (null-safe)
  if (company.domain) {
    twentyCompany.domain_name = company.domain;
  }

  if (company.website) {
    twentyCompany.website = company.website;
  }

  if (company.status) {
    twentyCompany.status = company.status;
  }

  return twentyCompany;
}
