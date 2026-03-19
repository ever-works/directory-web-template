import { FILTER_CONSTANTS } from '../constants';

/**
 * Truncate text to a specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number = FILTER_CONSTANTS.TEXT_TRUNCATE_LENGTH): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Check if text was truncated
 */
export function isTextTruncated(text: string, maxLength: number = FILTER_CONSTANTS.TEXT_TRUNCATE_LENGTH): boolean {
  return text.length > maxLength;
}

/**
 * Capitalize first letter of each word
 */
export function capitalizeWords(text: string): string {
  return text.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

/**
 * Create an excerpt from text with word boundary truncation
 * Truncates at the last complete word before maxChars limit
 * Examples:
 *   createExcerpt("Hello world this is a test", 15) → "Hello world..."
 *   createExcerpt("Short", 100) → "Short"
 */
export function createExcerpt(text: string, maxChars: number): string {
  if (!text || text.length <= maxChars) return text;

  // Find the last space before maxChars to avoid breaking words
  const truncated = text.substring(0, maxChars);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  // If no space found, truncate at maxChars (single long word)
  if (lastSpaceIndex === -1) {
    return truncated + '...';
  }

  // Truncate at last complete word
  return truncated.substring(0, lastSpaceIndex) + '...';
}

/**
 * Format tag/category name from kebab-case to Title Case
 * Examples:
 *   "open-source" → "Open Source"
 *   "project-management" → "Project Management"
 *   "api" → "API"
 */
export function formatDisplayName(name: string): string {
  if (!name) return '';

  // Convert kebab-case or snake_case to spaces
  const words = name.replace(/[-_]/g, ' ').split(' ');

  // Capitalize each word
  return words.map(word => {
    // Handle common acronyms that should be all caps
    const upperWord = word.toUpperCase();
    if (['API', 'UI', 'UX', 'CSS', 'HTML', 'HTTP', 'URL', 'REST', 'SQL', 'CSV'].includes(upperWord)) {
      return upperWord;
    }

    // Capitalize first letter
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
} 