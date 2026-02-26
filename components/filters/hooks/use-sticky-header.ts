import { useState, useCallback, useRef } from "react";
import { useThrottledScroll } from "@/hooks/use-throttled-scroll";
import { FILTER_CONSTANTS } from "../constants";

/**
 * Custom hook for managing sticky header behavior
 * Handles scroll-based sticky state changes with RAF-throttled scroll listener
 */
export function useStickyHeader(options: { enableSticky?: boolean } = {}) {
	const { enableSticky = true } = options;
	const [isSticky, setIsSticky] = useState(false);
	const isStickyRef = useRef(false);

	const handleScroll = useCallback(() => {
		const scrollPosition = window.scrollY;
		const scrollThreshold = FILTER_CONSTANTS.SCROLL_THRESHOLD;

		if (scrollPosition > scrollThreshold && !isStickyRef.current) {
			isStickyRef.current = true;
			setIsSticky(true);
		} else if (scrollPosition <= scrollThreshold && isStickyRef.current) {
			isStickyRef.current = false;
			setIsSticky(false);
		}
	}, []);

	useThrottledScroll(handleScroll, enableSticky);

	return {
		isSticky,
		setIsSticky,
	};
}
