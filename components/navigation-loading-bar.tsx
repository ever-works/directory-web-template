'use client';

import { TopLoadingBar } from './ui/top-loading-bar';

/**
 * Global navigation loading bar
 * Shows a thin loading bar at the top during client-side navigation
 */
export function NavigationLoadingBar() {
	return <TopLoadingBar isLoading={false} />;
}
