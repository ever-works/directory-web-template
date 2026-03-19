export function formatDate(date: Date, locale: string = 'en-US') {
    return new Date(date).toLocaleDateString(locale, {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    })
}

export function formatDateTime(date: Date, locale: string = 'en-US') {
    return new Date(date).toLocaleString(locale, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

/**
 * Formats a date with short month format (e.g., "Jan 7, 2026")
 * Returns '-' for null/undefined dates
 */
export function formatDateShort(date: Date | string | null | undefined, locale: string = 'en-US'): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}