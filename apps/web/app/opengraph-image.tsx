import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/config';

// Explicitly set Node.js runtime for consistency with dynamic OG images
export const runtime = 'nodejs';
export const alt = `${siteConfig.name} - ${siteConfig.tagline}`;
export const size = {
	width: 1200,
	height: 630
};
export const contentType = 'image/png';

export default async function Image() {
	const gradient = `linear-gradient(135deg, ${siteConfig.ogImage.gradientStart} 0%, ${siteConfig.ogImage.gradientEnd} 100%)`;

	return new ImageResponse(
		(
			<div
				style={{
					background: gradient,
					width: '100%',
					height: '100%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexDirection: 'column',
					padding: '80px',
					fontFamily: 'system-ui, sans-serif'
				}}
			>
				{/* Logo/Brand */}
				<div
					style={{
						fontSize: 96,
						fontWeight: 'bold',
						color: 'white',
						textAlign: 'center',
						marginBottom: 32,
						letterSpacing: '-2px'
					}}
				>
					{siteConfig.name}
				</div>

				{/* Tagline */}
				<div
					style={{
						fontSize: 36,
						color: '#e0e0e0',
						textAlign: 'center',
						lineHeight: 1.4,
						maxWidth: '80%',
						fontWeight: 500
					}}
				>
					{siteConfig.tagline}
				</div>

				{/* Decorative element */}
				<div
					style={{
						marginTop: 48,
						width: '120px',
						height: '4px',
						background: 'rgba(255, 255, 255, 0.4)',
						borderRadius: '2px'
					}}
				/>
			</div>
		),
		{
			...size
		}
	);
}
