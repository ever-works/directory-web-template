import { Logger } from '@/lib/logger';

const logger = Logger.create('SurveyHelpers');

export interface SurveyCSVResponse{
  id: string
  userId?: string | null
  completedAt?: string | Date | null
  data?: Record<string, unknown>
}

/**
 * Export survey responses to CSV
 */
export function exportResponsesToCSV(
  responses: SurveyCSVResponse[],
  filename: string
) {
  if (!Array.isArray(responses) || responses.length === 0) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    let s: unknown = val;
    if (typeof s === 'object') {
      try {
        s = JSON.stringify(s);
      } catch {
        s = String(s);
      }
    }
    const str = String(s);
    return /[,"\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const allKeys = new Set<string>();
  for (const r of responses) {
    const data = r?.data ?? {};
    Object.keys(data).forEach(k => allKeys.add(k));
  }
  const keys = Array.from(allKeys).sort();
  const header = ['Response ID', 'User ID', 'Completed At', ...keys]
    .map(escapeCell)
    .join(',');
  const rows: string[] = [header];
  for (const r of responses) {
    const completed = r?.completedAt
      ? new Date(r.completedAt).toISOString()
      : '';
    rows.push(
      [
        escapeCell(r.id),
        escapeCell(r.userId ?? 'Anonymous'),
        escapeCell(completed),
        ...keys.map(k => escapeCell(r?.data?.[k])),
      ].join(',')
    );
  }
  const csvContent = '\ufeff' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()}_responses.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Format status label to human-readable format
 */
export function formatSurveyStatusLabel(status: string): string {
  switch (status) {
    case 'published':
      return 'Published';
    case 'draft':
      return 'Draft';
    case 'closed':
      return 'Closed';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

/**
 * Format type label to human-readable format
 */
export function formatSurveyTypeLabel(type: string): string {
  switch (type) {
    case 'global':
      return 'Global Survey';
    case 'item':
      return 'Item Survey';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

/**
 * Get color class for survey status
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'published':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'draft':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    case 'closed':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
}

/**
 * Get color class for survey type
 */
export function getTypeColor(type: string): string {
  switch (type) {
    case 'global':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    case 'item':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
}

/**
 * Generate public survey link
 */
export function getPublicSurveyLink(slug: string, itemId?: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  if (itemId) {
    return `${baseUrl}/items/${itemId}/surveys/${slug}`;
  }
  return `${baseUrl}/surveys/${slug}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    logger.error('Failed to copy to clipboard', error);
    return false;
  }
}

