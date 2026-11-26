/**
 * Runs async tasks one after another per key, in the order they were queued; tasks for different
 * keys run at the same time. A task that fails does not stop the next one for its key.
 *
 * The location index uses it per item slug: a write started by an approval that waits for a slow
 * geocode must not land after a later rejection has removed the item's row.
 */
export function createKeyedSerialQueue() {
	const tails = new Map<string, Promise<unknown>>();

	return {
		run<T>(key: string, task: () => Promise<T>): Promise<T> {
			const previous = tails.get(key) ?? Promise.resolve();
			const next = previous.then(
				() => task(),
				() => task()
			);
			tails.set(key, next);
			const release = () => {
				if (tails.get(key) === next) tails.delete(key);
			};
			next.then(release, release);
			return next;
		},
		/** Keys with a task queued or running. */
		get size(): number {
			return tails.size;
		}
	};
}
