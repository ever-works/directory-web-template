import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://demo.ever.works");

	return {
		rules: [
			{
				userAgent: '*',
				allow: [
					'/',
					'/items/*',
					'/categories/*',
					'/tags/*',
					'/pricing',
					'/help',
					'/about'
				],
				disallow: ['/admin/*', '/api/*', '/client/settings/*', '/dashboard/*']
			}
		],
		sitemap: `${appUrl}/sitemap.xml`
	};
}
