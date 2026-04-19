import Script from 'next/script';

export function DataFastAnalytics({
	websiteId,
	domain
}: {
	websiteId: string | undefined | null;
	domain: string | undefined | null;
}) {
	if (!websiteId) return null;

	return (
		<Script
			defer
			data-website-id={websiteId}
			data-domain={domain || ''}
			src="https://datafa.st/js/script.js"
			strategy="afterInteractive"
		/>
	);
}
