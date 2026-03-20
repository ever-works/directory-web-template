'use client';

import { useNavigation } from '@/components/providers';
import { TopLoadingBar } from './ui/top-loading-bar';

/**
 * Global navigation loading bar
 * Shows a thin loading bar at the top during client-side navigation.
 */
export function NavigationLoadingBar() {
	const { isNavigating } = useNavigation();

	return <TopLoadingBar isLoading={isNavigating} />;
}
