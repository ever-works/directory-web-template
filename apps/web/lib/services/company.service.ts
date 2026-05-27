/**
 * Company Service
 * Business logic for company creation and management
 */

import { getCompanyByDomain, createCompany } from '@/lib/db/queries/company.queries';
import type { Company } from '@/lib/db/schema';

interface CompanyInput {
  name: string | null;
  website: string | null;
}

/**
 * Get or create company from client profile data
 * Deduplication strategy: domain lookup (primary) → name lookup (fallback) → create new
 *
 * @param input - Company name and website from client profile
 * @returns Company record or null if insufficient data
 *
 * **Dedup behaviour worth knowing:**
 *
 *   - **Domain match is normalised** (`extractDomain` strips
 *     `www.` and lowercases) so `WWW.Example.COM` and `example.com`
 *     land on the same row. But sibling subdomains are NOT
 *     normalised: `mail.example.com` and `example.com` are
 *     distinct companies — by design (different orgs may own
 *     different subdomains) but easy to forget when debugging
 *     "why did we get a duplicate".
 *
 *   - **Name fallback is EXACT MATCH.** Whitespace, punctuation,
 *     and case differences create duplicate rows ("Acme Corp" vs
 *     "acme corp" vs "Acme Corp."). If dedup quality matters,
 *     normalise the name before calling, or move normalisation
 *     into `getCompanyByName`.
 *
 *   - **Lookup-then-insert is NOT atomic.** Two concurrent calls
 *     with the same domain can both clear `getCompanyByDomain`
 *     and both proceed to `createCompany`. The schema's UNIQUE
 *     constraint on `(domain)` / `(slug)` is what catches the
 *     race; without it, this code produces duplicates under
 *     concurrency.
 *
 *   - **Slug generation is unchecked.** `generateSlug` truncates
 *     at 50 chars with no uniqueness probe — two companies whose
 *     names share a 50-char prefix collide on slug. Relies on
 *     downstream UNIQUE constraint to catch it (throws to caller).
 */
export async function getOrCreateCompanyFromClient(
  input: CompanyInput
): Promise<Company | null> {
  // Need at least name or website
  if (!input.name && !input.website) {
    return null;
  }

  // Extract and normalize domain from website
  const domain = input.website ? extractDomain(input.website) : null;

  // Look up by domain first (most reliable for deduplication)
  if (domain) {
    const existing = await getCompanyByDomain(domain);
    if (existing) {
      return existing;
    }
  }

  // Fallback to name lookup (exact match)
  if (input.name) {
    const { getCompanyByName } = await import('@/lib/db/queries/company.queries');
    const existing = await getCompanyByName(input.name);
    if (existing) {
      return existing;
    }
  }

  // Create new company (only if both lookups fail)
  const slug = generateSlug(input.name || domain || 'company');

  const newCompany = await createCompany({
    name: input.name || domain || 'Unknown',
    website: input.website || undefined,
    domain: domain || undefined,
    slug,
    status: 'active',
  });

  return newCompany;
}

/**
 * Get or create company from brand and source URL (for items)
 * Deduplication strategy: domain lookup (primary) → name lookup (fallback) → create new
 *
 * @param brand - Brand name from item
 * @param sourceUrl - Item source URL for domain extraction
 * @returns Company record
 *
 * @example
 * const company = await getOrCreateCompanyFromBrand('Acme Corp', 'https://acme.com/product');
 */
export async function getOrCreateCompanyFromBrand(
  brand: string,
  sourceUrl: string
): Promise<Company> {
  // Extract and normalize domain from source URL
  const domain = extractDomain(sourceUrl);

  // Look up by domain first (most reliable for deduplication)
  if (domain) {
    const existing = await getCompanyByDomain(domain);
    if (existing) {
      return existing;
    }
  }

  // Fallback to name lookup (exact match)
  const { getCompanyByName } = await import('@/lib/db/queries/company.queries');
  const existing = await getCompanyByName(brand);
  if (existing) {
    return existing;
  }

  // Create new company (only if both lookups fail)
  const slug = generateSlug(brand);

  const newCompany = await createCompany({
    name: brand,
    website: sourceUrl,
    domain: domain || undefined,
    slug,
    status: 'active',
  });

  return newCompany;
}

/**
 * Extract domain from URL
 * Normalizes to lowercase and removes www prefix
 *
 * @param url - Website URL (with or without protocol)
 * @returns Normalized domain or null if invalid
 *
 * @example
 * extractDomain('https://www.Example.COM/path') // 'example.com'
 * extractDomain('Example.com') // 'example.com'
 */
function extractDomain(url: string): string | null {
  try {
    // Add protocol if missing
    const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
    const parsed = new URL(urlWithProtocol);

    // Get hostname, convert to lowercase, remove www prefix
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Generate URL-safe slug from text
 * Converts to lowercase, replaces non-alphanumeric with hyphens
 *
 * @param text - Input text (company name or domain)
 * @returns URL-safe slug (max 50 chars)
 *
 * @example
 * generateSlug('Acme Corp!') // 'acme-corp'
 * generateSlug('example.com') // 'example-com'
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}
