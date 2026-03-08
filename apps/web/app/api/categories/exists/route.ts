import { NextRequest, NextResponse } from 'next/server';
import { fetchItems } from '@/lib/content';

/**
 * API endpoint to check if categories exist
 * Returns { exists: boolean, count: number }
 */
export async function GET(request: NextRequest) {
	try {
		// Fetch items to get categories
		// We use the default locale, but this could be made locale-aware if needed
		const locale = request?.nextUrl?.searchParams?.get('locale') || 'en';
		const { categories } = await fetchItems({ lang: locale });

		const hasCategories = Array.isArray(categories) && categories.length > 0;

		return NextResponse.json({
			exists: hasCategories,
			count: categories?.length || 0
		});
	} catch (error) {
		// Only log errors in development mode
		if (process.env.NODE_ENV === 'development') {
			console.error('Error checking categories existence:', error);
		}
		// On error, assume categories don't exist to be safe
		return NextResponse.json({
			exists: false,
			count: 0
		});
	}
}
