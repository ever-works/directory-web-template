export type RelayEventOutcome = 'processed' | 'duplicate' | 'retry';

type Dispatch = () => Promise<boolean>;

/**
 * Tracks only successfully fulfilled relay events.
 *
 * A failed dispatch remains retryable, while a concurrent delivery is asked to
 * retry until the in-flight attempt has a final outcome. The completed set is
 * intentionally bounded because it is only a per-pod burst deduplicator; the
 * payment handlers remain the durable idempotency boundary.
 */
export class RelayEventCoordinator {
	private readonly completed = new Set<string>();
	private readonly inFlight = new Set<string>();

	constructor(private readonly completedLimit = 1000) {}

	async process(eventId: string, dispatch: Dispatch): Promise<RelayEventOutcome> {
		if (this.completed.has(eventId)) return 'duplicate';
		if (this.inFlight.has(eventId)) return 'retry';

		this.inFlight.add(eventId);
		try {
			if (!(await dispatch())) return 'retry';

			if (this.completed.size >= this.completedLimit) this.completed.clear();
			this.completed.add(eventId);
			return 'processed';
		} catch {
			return 'retry';
		} finally {
			this.inFlight.delete(eventId);
		}
	}
}
