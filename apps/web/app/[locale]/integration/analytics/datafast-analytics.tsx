import Script from 'next/script';

export function DataFastAnalytics({ apiKey }: { apiKey: string | undefined | null }) {
	if (!apiKey) return null;

	return (
		<Script defer data-api-key={apiKey} src="https://cdn.datafast.io/js/script.js" strategy="afterInteractive" />
	);
}
