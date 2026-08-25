import assert from 'node:assert/strict';
import { test } from 'node:test';

import { RelayEventCoordinator } from '../relay-event-coordinator';
import { assertRelayFulfilment } from '../relay-fulfilment';
import { extractRelayWorkId } from '../relay-work-id';
import { buildPaymentSucceededBaseEmailData } from '../webhook-email-data';

test('payment success formats amount_due before the email boundary', () => {
	const emailData = buildPaymentSucceededBaseEmailData({
		id: 'pi_amount_format',
		amount_due: 1234,
		currency: 'usd',
		customer_email: 'buyer@example.com'
	});

	assert.equal(emailData.amount, '12.34 USD');
});

test('a failed fulfilment is retryable and is not remembered as a duplicate', async () => {
	const events = new RelayEventCoordinator();
	let attempts = 0;
	const fail = async () => {
		attempts += 1;
		return false;
	};

	assert.equal(await events.process('evt_retry_after_failure', fail), 'retry');
	assert.equal(await events.process('evt_retry_after_failure', fail), 'retry');
	assert.equal(attempts, 2);
});

test('a successfully fulfilled event is remembered as a duplicate', async () => {
	const events = new RelayEventCoordinator();
	let attempts = 0;
	const succeed = async () => {
		attempts += 1;
		return true;
	};

	assert.equal(await events.process('evt_completed', succeed), 'processed');
	assert.equal(await events.process('evt_completed', succeed), 'duplicate');
	assert.equal(attempts, 1);
});

test('invoice ownership is read from subscription details and line metadata', () => {
	assert.equal(
		extractRelayWorkId({
			data: { object: { subscription_details: { metadata: { work_id: 'work-invoice' } } } }
		}),
		'work-invoice'
	);
	assert.equal(
		extractRelayWorkId({
			data: { object: { lines: { data: [{}, { metadata: { work_id: 'work-line' } }] } } }
		}),
		'work-line'
	);
});

test('an event without a supported ownership key is not accepted', () => {
	assert.equal(extractRelayWorkId({ data: { object: { metadata: {} } } }), null);
});

test('an unsuccessful service result becomes a retryable fulfilment failure', () => {
	assert.throws(() => assertRelayFulfilment(false, 'payment success email'), /payment success email failed/);
});
