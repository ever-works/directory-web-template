'use client';

import { useEffect } from 'react';

interface ItemViewTrackerProps {
	slug: string;
}

/**
 * Client-side component that tracks item page views.
 *
 * Records a unique daily view by calling the views API endpoint.
 * Runs once on mount, does not affect page performance or reliability.
 * Errors are swallowed (best-effort tracking).
 */
export function ItemViewTracker({ slug }: ItemViewTrackerProps) {
	useEffect(() => {
		fetch(`/api/items/${slug}/views`, {
			method: 'POST',
			keepalive: true
		}).catch(() => {
			// Best-effort tracking - swallow errors silently
		});
	}, [slug]);

	return null;
}
