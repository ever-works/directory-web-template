'use client';

import { ListingSkeleton } from '@/components/ui/skeleton';
import { useNavigation } from '@/components/providers';

export default function Loading() {
	const { isInitialLoad } = useNavigation();
	
	// Only show skeleton on initial page load, not during client navigation
	if (!isInitialLoad) {
		return null;
	}
	
	return <ListingSkeleton />;
}
