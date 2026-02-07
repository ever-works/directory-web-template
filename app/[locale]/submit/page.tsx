export const revalidate = 600;

import { getCachedItems } from '@/lib/content';
import { SubmitFormClient } from '@/components/submit/submit-form-client';
import { cn } from '@/lib/utils';

export default async function SubmitPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const { items, categories, tags } = await getCachedItems({
		lang: locale
	});

	return (
		<div
			className={cn(
				'w-full min-h-screen bg-linear-to-br from-gray-50 via-white',
				'to-gray-100 dark:from-gray-900 dark:via-gray-800',
				'dark:to-gray-900 transition-colors duration-300'
			)}
		>
			<SubmitFormClient
				initialData={{
					items,
					categories,
					tags
				}}
				locale={locale}
			/>
		</div>
	);
}
