'use client';

import Script from 'next/script';

export function JitsuAnalytics({
	jitsuKey,
	domain,
	host
}: {
	jitsuKey: string | undefined | null;
	domain: string | undefined | null;
	host?: string | undefined | null;
}) {
	if (!jitsuKey) return null;

	let scriptHost = host || 'https://t.jitsu.com';
	if (scriptHost.endsWith('/')) {
		scriptHost = scriptHost.slice(0, -1);
	}

	return (
		<Script
			id="jitsu-analytics-script"
			defer
			data-key={jitsuKey}
			data-domain={domain || undefined}
			src={`${scriptHost}/s/lib.js`}
			strategy="afterInteractive"
			onLoad={() => {
				if (typeof (window as any).jitsu === 'function') {
					(window as any).jitsu('track', 'pageview');
				}
			}}
		/>
	);
}
