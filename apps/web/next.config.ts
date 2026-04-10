import * as path from 'path';
import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';
import { sentryWebpackPluginOptions } from './sentry.config';
import { generateImageRemotePatterns } from './lib/utils/image-domains';

const nextConfig: NextConfig = {
	turbopack: {
		root: path.join(__dirname, '../..')
	},
	output: 'standalone',
	outputFileTracingRoot: path.join(__dirname, '../..'),
	serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
	experimental: {
		optimizePackageImports: ['@heroui/react', 'lucide-react']
	},
	trailingSlash: false,
	generateEtags: false,
	poweredByHeader: false,
	staticPageGenerationTimeout: 180,
	webpack: (config, { dev, isServer }) => {
		config.ignoreWarnings = [
			{ module: /@supabase\/realtime-js/ },
			{ module: /@supabase\/supabase-js/ },
			{ module: /bcryptjs/ },
			{ message: /bcryptjs/ },
			{ module: /postgres/ },
			{ message: /postgres/ },
			{ module: /stripe/ },
			{ message: /stripe/ }
		];

		// Suppress verbose output during build in CI
		if (process.env.CI || process.env.VERCEL) {
			config.infrastructureLogging = {
				level: 'error'
			};
		}

		// Exclude .content/ directory from webpack watching in development
		// Prevents rebuilds when content files change (220+ markdown files)
		if (dev) {
			config.watchOptions = {
				...config.watchOptions,
				ignored: ['**/node_modules/**', '**/.git/**', '**/.content/**']
			};
		}

		return config;
	},
	images: {
		remotePatterns: generateImageRemotePatterns(),
		// Allow SVG images
		dangerouslyAllowSVG: true,
		contentDispositionType: 'attachment',
		contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
		// Keep optimization enabled for better performance
		unoptimized: false
	},
	async rewrites() {
		return [
			{
				source: '/:path',
				destination: '/:path/discover/1'
			},
			{
				source: '/:path/discover',
				destination: '/:path/discover/1'
			}
		];
	},
	async headers() {
		return [
			{
				source: '/(.*)',
				headers: [
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff'
					},
					{
						key: 'X-Frame-Options',
						value: 'DENY'
					},
					{
						key: 'Referrer-Policy',
						value: 'strict-origin-when-cross-origin'
					},
					{
						key: 'X-DNS-Prefetch-Control',
						value: 'on'
					},
					{
						key: 'Strict-Transport-Security',
						value: 'max-age=63072000; includeSubDomains; preload'
					},
					{
						key: 'Content-Security-Policy',
						value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com https://js.stripe.com https://www.googletagmanager.com https://plausible.io https://cdn.datafast.io https://datafa.st https://t.jitsu.com https://cdn.segment.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: https://www.google-analytics.com https://stats.g.doubleclick.net; font-src 'self'; connect-src 'self' https: https://www.google-analytics.com https://stats.g.doubleclick.net https://plausible.io https://datafa.st https://t.jitsu.com https://api.segment.io; frame-src 'self' https://assets.lemonsqueezy.com https://js.stripe.com https://hooks.stripe.com; frame-ancestors 'none';"
					}
				]
			}
		];
	}
} satisfies NextConfig;

// Next.js 16: Specify the path to the next-intl config file
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Apply plugins in the correct order
const configWithIntl = withNextIntl(nextConfig);

// Sentry configuration with type casting to avoid TypeScript errors
const finalConfig = withSentryConfig(configWithIntl, sentryWebpackPluginOptions) as NextConfig;

export default finalConfig;
