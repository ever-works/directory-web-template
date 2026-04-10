import Script from 'next/script';

export function PlausibleAnalytics({ domain, scriptId }: { domain?: string | null; scriptId?: string | null }) {
	if (!domain && !scriptId) return null;

	if (scriptId) {
		return (
			<>
				<Script async src={`https://plausible.io/js/${scriptId}`} strategy="afterInteractive" />
				<Script id="plausible-init" strategy="afterInteractive">
					{`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
plausible.init();`}
				</Script>
			</>
		);
	}

	return (
		<Script defer data-domain={domain || ''} src="https://plausible.io/js/script.js" strategy="afterInteractive" />
	);
}
