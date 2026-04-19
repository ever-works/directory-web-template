import { Suspense } from 'react';
import { GoogleAnalytics } from './google-analytics';
import { PlausibleAnalytics } from './plausible-analytics';
import { DataFastAnalytics } from './datafast-analytics';
import { JitsuAnalytics } from './jitsu-analytics';
import { SegmentAnalytics } from './segment-analytics';
import type { AnalyticsConfig } from '@/lib/config/types';

interface ThirdPartyAnalyticsProps {
	config: AnalyticsConfig;
}

export function ThirdPartyAnalytics({ config }: ThirdPartyAnalyticsProps) {
	return (
		<Suspense fallback={null}>
			{config.googleAnalytics?.enabled && (
				<GoogleAnalytics gaId={config.googleAnalytics.measurementId} />
			)}
			{config.plausible?.enabled && (
				<PlausibleAnalytics 
					domain={config.plausible.domain} 
					scriptId={config.plausible.scriptId}
				/>
			)}
			{config.dataFast?.enabled && (
				<DataFastAnalytics 
					websiteId={config.dataFast.websiteId} 
					domain={config.dataFast.domain} 
				/>
			)}
			{config.jitsu?.enabled && (
				<JitsuAnalytics jitsuKey={config.jitsu.key} domain={config.jitsu.domain} host={config.jitsu.host} />
			)}
			{config.segment?.enabled && (
				<SegmentAnalytics writeKey={config.segment.writeKey} />
			)}
		</Suspense>
	);
}
