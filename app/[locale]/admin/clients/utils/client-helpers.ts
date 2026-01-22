/**
 * Client Helpers Utility
 * Provides reusable helper functions for client management
 * Following SOLID principles: Single Responsibility - each function has one clear purpose
 */

/**
 * Get the top provider name from provider statistics
 */
export function getTopProviderName(byProvider: Record<string, number>): string {
	const providers = Object.entries(byProvider || {});
	if (providers.length === 0 || providers.every(([, count]) => count === 0)) {
		return '—';
	}
	const [key] = providers.reduce((accumulator, current) =>
		accumulator[1] > current[1] ? accumulator : current
	);
	return key === 'credentials' ? 'Email' : key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Get the count of users using the top provider
 */
export function getTopProviderCount(byProvider: Record<string, number>): number {
	const providers = Object.entries(byProvider || {});
	if (providers.length === 0 || providers.every(([, count]) => count === 0)) {
		return 0;
	}
	const topProvider = providers.reduce((accumulator, current) =>
		accumulator[1] > current[1] ? accumulator : current
	);
	return topProvider[1];
}

/**
 * Get color variant for client status badge
 */
export function getStatusColor(status: string): 'success' | 'default' | 'danger' | 'warning' {
	switch (status) {
		case 'active':
			return 'success';
		case 'inactive':
			return 'default';
		case 'suspended':
			return 'danger';
		case 'trial':
			return 'warning';
		default:
			return 'default';
	}
}

/**
 * Get color variant for subscription plan badge
 */
export function getPlanColor(plan: string): 'success' | 'primary' | 'default' {
	switch (plan) {
		case 'premium':
			return 'success';
		case 'standard':
			return 'primary';
		case 'free':
			return 'default';
		default:
			return 'default';
	}
}

/**
 * Get color variant for account type badge
 */
export function getAccountTypeColor(type: string): 'default' | 'primary' | 'success' {
	switch (type) {
		case 'individual':
			return 'default';
		case 'business':
			return 'primary';
		case 'enterprise':
			return 'success';
		default:
			return 'default';
	}
}

/**
 * Compute date range from preset selection
 */
export function computeDateRange(
	preset: 'all' | 'last7' | 'last30' | 'last90' | 'thisMonth' | 'custom',
	customDateFrom?: string,
	customDateTo?: string
): { from: string; to: string } {
	const now = new Date();
	let from = '';
	let to = '';

	switch (preset) {
		case 'last7':
			from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
			break;
		case 'last30':
			from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
			break;
		case 'last90':
			from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
			break;
		case 'thisMonth':
			from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
			to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
			break;
		case 'custom':
			from = customDateFrom || '';
			to = customDateTo || '';
			break;
		default: // 'all'
			from = '';
			to = '';
	}

	return { from, to };
}

export function toDateTime(date: unknown, locale: string = "en"): string {
	try {
	  if (!date) return "—";
	  const d = new Date(String(date));
	  if (Number.isNaN(d.getTime())) return "—";
	  return new Intl.DateTimeFormat(locale, {
		year: "numeric",
		month: "short",
		day: "2-digit",
	  }).format(d);
	} catch {
	  return "—";
	}
  }