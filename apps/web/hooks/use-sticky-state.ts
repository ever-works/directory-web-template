import { useState, useEffect, useRef } from "react";

interface UseStickyStateOptions {
  /**
   * Threshold value for the IntersectionObserver (0-1)
   * @default 0
   */
  threshold?: number;

  /**
   * Root margin for the IntersectionObserver
   * @default '0px'
   */
  rootMargin?: string;

  /**
   * Enable debug mode to log state changes
   * @default false
   */
  debug?: boolean;
}

/**
 * Hook that tracks whether an element has become sticky during scroll
 *
 * @param options Configuration options for the sticky detection
 * @returns An object containing the sticky state and refs to attach to your elements
 *
 * @example
 * ```tsx
 * const { isSticky, sentinelRef, targetRef } = useStickyState();
 *
 * return (
 *   <>
 *     <div ref={sentinelRef} className="h-4 w-full" />
 *     <div
 *       ref={targetRef}
 *       className={`sticky top-0 z-10 transition-all ${
 *         isSticky ? 'bg-white shadow-lg' : 'bg-transparent'
 *       }`}
 *     >
 *       Sticky content
 *     </div>
 *   </>
 * );
 * ```
 */
export function useStickyState(options: UseStickyStateOptions = {}) {
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  const { threshold = 0, rootMargin = "0px", debug = false } = options;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const target = targetRef.current;

    if (!sentinel || !target) return;

    const observerOptions = {
      threshold,
      rootMargin,
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      const newIsSticky = !entry.isIntersecting;

      if (debug) {
        console.log(`Sticky state changed: ${newIsSticky}`, {
          isIntersecting: entry.isIntersecting,
          boundingClientRect: entry.boundingClientRect,
          rootBounds: entry.rootBounds,
          intersectionRatio: entry.intersectionRatio,
          target: entry.target,
        });
      }

      if (newIsSticky !== isSticky) {
        setTimeout(() => {
          setIsSticky(newIsSticky);
        }, 10);
      }
    };

    const observer = new IntersectionObserver(
      handleIntersection,
      observerOptions
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, debug, isSticky]);

  return { isSticky, sentinelRef, targetRef };
}

interface StickyHeaderProps {
  enableSticky?: boolean;
}
export const useStickyHeader = ({ enableSticky }: StickyHeaderProps) => {
  const [isSticky, setIsSticky] = useState(false);
  useEffect(() => {
    if (enableSticky) {
      const handleScroll = () => {
        const scrollPosition = window.scrollY;
        const scrollThreshold = 250;
        if (scrollPosition > scrollThreshold && !isSticky) {
          setIsSticky(true);
        } else if (scrollPosition <= scrollThreshold && isSticky) {
          setIsSticky(false);
        }
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", handleScroll);
      };
    }
    return undefined;
  }, [isSticky, enableSticky]);

  return { isSticky };
};
