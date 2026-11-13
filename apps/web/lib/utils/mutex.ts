/**
 * A minimal in-process mutex.
 *
 * `createMutex()` returns a `run` function: the callbacks passed to it execute
 * one at a time, in call order, and a callback that throws neither blocks the
 * next one nor changes its result. It only serialises work inside one Node
 * process; it is not a distributed lock.
 */
export function createMutex(): <T>(fn: () => Promise<T>) => Promise<T> {
	// Never rejects: failures are reported to the caller through `result`.
	let tail: Promise<void> = Promise.resolve();

	return function run<T>(fn: () => Promise<T>): Promise<T> {
		const result = tail.then(fn);
		tail = result.then(
			() => undefined,
			() => undefined
		);
		return result;
	};
}
