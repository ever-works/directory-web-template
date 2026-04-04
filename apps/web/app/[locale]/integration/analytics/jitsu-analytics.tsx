import Script from 'next/script';

export function JitsuAnalytics({
	jitsuKey,
	domain,
}: {
	jitsuKey: string | undefined | null;
	domain: string | undefined | null;
}) {
	if (!jitsuKey || !domain) return null;

	return (
		<Script
			defer
			data-key={jitsuKey}
			data-domain={domain}
			src="https://t.jitsu.com/s/lib.js"
			strategy="afterInteractive"
		/>
	);
}
