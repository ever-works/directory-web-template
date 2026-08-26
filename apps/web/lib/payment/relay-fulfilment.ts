/** Convert a logged service-level failure into a relay-level retry signal. */
export function assertRelayFulfilment(success: boolean, label: string): asserts success {
	if (!success) throw new Error(`${label} failed`);
}
