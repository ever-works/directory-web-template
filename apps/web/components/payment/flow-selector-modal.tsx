'use client';

import { useCallback, memo } from 'react';
import { PaymentFlow } from '@/lib/payment/types/payment';
import { Modal, ModalContent, ModalBody } from '@/components/ui/modal';
import { CreditCard, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentFlowSelectorModalProps {
	selectedFlow: PaymentFlow;
	title?: string;
	isOpen: boolean;
	onClose: () => void;
	onSelect?: (flow: PaymentFlow) => void;
}

const FLOWS_DATA = [
	{
		flow: PaymentFlow.PAY_AT_START,
		title: 'Pay now',
		description: 'Payment processed immediately. Priority review queue.',
		icon: CreditCard,
		benefits: ['Immediate processing', 'Priority review', 'Faster approval']
	},
	{
		flow: PaymentFlow.PAY_AT_END,
		title: 'Pay later',
		description: 'Charged only after your submission is approved.',
		icon: Clock,
		benefits: ['No upfront cost', 'Review before payment', 'Risk-free']
	}
] as const;

export const PaymentFlowSelectorModal = memo(function PaymentFlowSelectorModal({
	selectedFlow,
	title = 'Payment timing',
	isOpen,
	onClose,
	onSelect
}: PaymentFlowSelectorModalProps) {
	const handleCardClick = useCallback((flow: PaymentFlow) => {
		if (onSelect) {
			onSelect(flow);
			onClose();
		}
	}, [onSelect, onClose]);

	const renderFlowCard = (flowOption: typeof FLOWS_DATA[number]) => {
		const IconComponent = flowOption.icon;
		const isSelected = selectedFlow === flowOption.flow;

		return (
			<button
				key={flowOption.flow}
				onClick={() => handleCardClick(flowOption.flow)}
				type="button"
				className={cn(
					'group relative w-full text-left rounded-lg border px-4 py-3.5 transition-all duration-150 outline-none',
					onSelect ? 'cursor-pointer' : 'cursor-default',
					isSelected
						? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-white/5'
						: 'border-gray-200 dark:border-white/8 bg-white dark:bg-transparent hover:border-gray-400 dark:hover:border-white/20 hover:bg-gray-50/60 dark:hover:bg-white/3'
				)}
			>
				<div className="flex items-start gap-3">
					{/* Icon */}
					<div className={cn(
						'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors duration-150',
						isSelected
							? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
							: 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 group-hover:border-gray-300 dark:group-hover:border-white/20'
					)}>
						<IconComponent className="w-3.5 h-3.5" />
					</div>

					{/* Content */}
					<div className="flex-1 min-w-0">
						<div className="flex items-center justify-between gap-2 mb-0.5">
							<span className={cn(
								'text-[13px] font-medium leading-none',
								isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
							)}>
								{flowOption.title}
							</span>
							{isSelected && (
								<span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 dark:bg-white shrink-0">
									<Check className="w-2.5 h-2.5 text-white dark:text-gray-900" strokeWidth={3} />
								</span>
							)}
						</div>
						<p className="text-xs leading-relaxed text-gray-500 dark:text-gray-500 mb-2.5">
							{flowOption.description}
						</p>
						<div className="flex flex-wrap gap-x-3 gap-y-1">
							{flowOption.benefits.map((benefit, index) => (
								<span
									key={`${flowOption.flow}-${index}`}
									className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500"
								>
									<span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-white/20 shrink-0" />
									{benefit}
								</span>
							))}
						</div>
					</div>
				</div>
			</button>
		);
	};

	if (!isOpen) return null;

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			isDismissable={true}
			title={title}
			subtitle="Choose when to be charged for your submission"
			size="sm"
			backdrop="opaque"
			hideCloseButton={false}
			className="bg-white dark:bg-[#0a0a0a] p-0"
		>
			<ModalContent>
				<ModalBody className="space-y-2 px-4 pb-4 pt-1">
					{FLOWS_DATA.map(renderFlowCard)}
				</ModalBody>
			</ModalContent>
		</Modal>
	);
});
