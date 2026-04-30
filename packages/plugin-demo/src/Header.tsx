import type { SlotComponentProps } from '@ever-works/plugin-sdk';
import type { DemoConfig } from './config';

export function DemoHeaderBadge({ ctx }: SlotComponentProps<DemoConfig>) {
	if (!ctx.config.enabled) return null;
	return (
		<span
			data-plugin="demo"
			data-testid="demo-plugin-badge"
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				padding: '2px 8px',
				borderRadius: 999,
				fontSize: 12,
				background: 'rgba(0,0,0,0.06)',
			}}
		>
			{ctx.config.greeting}
		</span>
	);
}
