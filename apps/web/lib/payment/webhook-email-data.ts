import { formatAmount, formatPaymentMethod } from './payment-format';

export type PaymentSucceededWebhookData = {
	id: string;
	amount_due: number;
	currency: string;
	customer_name?: string;
	customer_email?: string;
	payment_method?: unknown;
	receipt_url?: string;
};

export function buildPaymentSucceededBaseEmailData(data: PaymentSucceededWebhookData) {
	return {
		customerName: data.customer_name,
		customerEmail: data.customer_email,
		amount: formatAmount(data.amount_due, data.currency),
		currency: data.currency,
		paymentMethod: formatPaymentMethod(data.payment_method),
		transactionId: data.id,
		receiptUrl: data.receipt_url
	};
}
