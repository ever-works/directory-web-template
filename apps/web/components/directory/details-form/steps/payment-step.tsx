'use client';

import { PricingSection } from '@/components/pricing/pricing-section';
import { PaymentPlan } from '@/lib/constants';

interface PaymentStepProps {
	onSelectPlan?: (planId: string) => void;
	selectedPlan?: string | null;
}

export function PaymentStep({ onSelectPlan, selectedPlan }: PaymentStepProps) {
	// Convert string to PaymentPlan enum if provided
	const initialPlan = selectedPlan as PaymentPlan | null;

	return (
		<PricingSection
			isReview={true}
			onSelectPlan={onSelectPlan}
			initialSelectedPlan={initialPlan}
		/>
	);
}
