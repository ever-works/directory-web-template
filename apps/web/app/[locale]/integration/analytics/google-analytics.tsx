'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export function GoogleAnalytics({ gaId }: { gaId: string | undefined | null }) {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	useEffect(() => {
		if (pathname && gaId) {
			const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
			// @ts-ignore
			if (typeof window !== 'undefined' && window.gtag) {
				// @ts-ignore
				window.gtag('config', gaId, {
					page_path: url,
				});
			}
		}
	}, [pathname, searchParams, gaId]);

	if (!gaId) return null;

	return (
		<>
			<Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
			<Script id="google-analytics" strategy="afterInteractive">
				{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
			</Script>
		</>
	);
}
