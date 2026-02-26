import { useEffect, useRef } from "react";

/**
 * A reusable hook that wraps `addEventListener('scroll', ...)` with RAF-based throttling.
 * Uses `requestAnimationFrame` instead of lodash throttle because RAF naturally syncs
 * with the browser paint cycle (exactly 1 callback per frame = ~60fps cap).
 */
export function useThrottledScroll(
	callback: () => void,
	enabled: boolean = true
) {
	const rafId = useRef<number | null>(null);

	useEffect(() => {
		if (!enabled) return;

		const handleScroll = () => {
			if (rafId.current !== null) return;
			rafId.current = requestAnimationFrame(() => {
				callback();
				rafId.current = null;
			});
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", handleScroll);
			if (rafId.current !== null) cancelAnimationFrame(rafId.current);
		};
	}, [callback, enabled]);
}
