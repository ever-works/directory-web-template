import { PricingSection } from '@/components/pricing/pricing-section';
import { Container } from '@/components/ui/container';
import { cn } from '@/lib/utils';

// Enable ISR with 1 hour revalidation for pricing page
export const revalidate = 3600;

export default function PricingPage() {
	return (
		<div
			className={cn(
				'w-full min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300'
			)}
		>
			<Container maxWidth="7xl" padding="default" useGlobalWidth className="py-12">
				<PricingSection />
			</Container>

		</div>
	);
}
