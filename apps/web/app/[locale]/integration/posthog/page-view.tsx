'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

export default function PostHogPageView(): null {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	useEffect(() => {
		if (!pathname) return;

		let url = window.origin + pathname;
		if (searchParams.toString()) {
			url = url + `?${searchParams.toString()}`;
		}

		analytics.trackPageView(url);
	}, [pathname, searchParams]);

	return null;
}
