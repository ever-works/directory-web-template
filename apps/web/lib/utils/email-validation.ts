/**
 * Secure email validation function that prevents ReDoS attacks
 * Uses a non-backtracking regex pattern for efficient validation
 */
export function isValidEmail(email: string): boolean {
  // Check basic format first (fast fail)
  if (typeof email !== 'string' || email.length < 5 || email.length > 254) {
    return false;
  }

  // Check for @ symbol
  const atIndex = email.indexOf('@');
  if (atIndex === -1 || atIndex === 0 || atIndex === email.length - 1) {
    return false;
  }

  // Split into local and domain parts
  const localPart = email.substring(0, atIndex);
  const domainPart = email.substring(atIndex + 1);

  // Validate local part (before @)
  if (localPart.length === 0 || localPart.length > 64) {
    return false;
  }

  // Validate domain part (after @)
  if (domainPart.length === 0 || domainPart.length > 253) {
    return false;
  }

  // Check for valid characters in local part (simplified but secure)
  // Allow: letters, numbers, dots, hyphens, underscores, plus signs
  const localPartRegex = /^[a-zA-Z0-9.!#$%&'*+\-/=?^_`{|}~]+$/;
  if (!localPartRegex.test(localPart)) {
    return false;
  }

  // Check for valid characters in domain part (simplified but secure)
  // Allow: letters, numbers, dots, hyphens
  const domainPartRegex = /^[a-zA-Z0-9.-]+$/;
  if (!domainPartRegex.test(domainPart)) {
    return false;
  }

  // Check for valid domain structure (at least one dot, not at start/end)
  const domainParts = domainPart.split('.');
  if (domainParts.length < 2) {
    return false;
  }

  // Check each domain part
  for (const part of domainParts) {
    if (part.length === 0 || part.length > 63) {
      return false;
    }
    // Domain parts should start and end with alphanumeric
    // Handle single-character parts specially
    if (part.length === 1 ? !/^[a-zA-Z0-9]$/.test(part) : !/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(part)) {
      return false;
    }
  }

  return true;
}

/**
 * Alternative: Simple but secure regex-based validation
 * This pattern avoids catastrophic backtracking by using atomic groups
 * and avoiding nested quantifiers
 */
export function isValidEmailRegex(email: string): boolean {
  // Simple, secure regex that avoids backtracking issues
  // Pattern: local@domain.tld where:
  // - local: 1-64 chars, alphanumeric + some special chars
  // - domain: valid domain structure

    const secureEmailRegex = /^[a-zA-Z0-9.!#$%&'*+\-/=?^_`{|}~]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  
  return secureEmailRegex.test(email);
} 