import Script from 'next/script';

export function PlausibleAnalytics({ domain }: { domain: string | undefined | null }) {
	if (!domain) return null;

	return (
		<Script defer data-domain={domain} src="https://plausible.io/js/script.js" strategy="afterInteractive" />
	);
}
