import { useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useRef } from "react";

interface UseScrollToTopOptions {
  behavior?: ScrollBehavior;
  delay?: number;
  offset?: number;
  threshold?: number;
  duration?: number;
  easing?: "linear" | "easeInOut" | "easeOut" | "easeIn" | "bounceOut";
}

const easingFunctions = {
  linear: (t: number) => t,
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOut: (t: number) => t * (2 - t),
  easeIn: (t: number) => t * t,
  bounceOut: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      const adjustedT = t - 1.5 / 2.75;
      return 7.5625 * adjustedT * adjustedT + 0.75;
    } else if (t < 2.5 / 2.75) {
      const adjustedT = t - 2.25 / 2.75;
      return 7.5625 * adjustedT * adjustedT + 0.9375;
    } else {
      const adjustedT = t - 2.625 / 2.75;
      return 7.5625 * adjustedT * adjustedT + 0.984375;
    }
  },
};

export function useScrollToTop(options: UseScrollToTopOptions = {}) {
  const {
    behavior = "smooth",
    delay = 150,
    offset = 0,
    threshold = 50,
    duration = 800,
    easing = "easeInOut",
  } = options;
  const router = useRouter();
  const isNavigatingRef = useRef(false);
  const animationFrameRef = useRef<number>(0);
  const isScrolled = useCallback(() => window.scrollY > threshold, [threshold]);

  const smoothScrollTo = useCallback(
    (targetY: number, customDuration?: number) => {
      if (typeof window === 'undefined') return;
      const startY = window.scrollY;
      const distance = targetY - startY;
      const animationDuration = customDuration || duration;
      const startTime = performance.now();

      const animateScroll = (currentTime: number) => {
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / animationDuration, 1);

        const easedProgress = easingFunctions[easing](progress);
        const currentY = startY + distance * easedProgress;

        window.scrollTo(0, currentY);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animateScroll);
        }
      };

      // Cancel any ongoing animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(animateScroll);
    },
    [duration, easing]
  );

  const scrollToTop = useCallback(
    (customDuration?: number) => {
      if (behavior === "smooth") {
        smoothScrollTo(offset, customDuration);
      } else {
        window.scrollTo({
          top: offset,
          behavior,
        });
      }
    },
    [behavior, offset, smoothScrollTo]
  );

  const navigateWithScroll = useCallback(
    (path: string, scrollDuration?: number) => {
      const SCROLL_DELAY_FACTOR = 10;
      const MAX_DYNAMIC_DELAY = 1000;
      const NAVIGATION_RESET_DELAY = 300;
      if (isNavigatingRef.current) return;

      const isScrolled = window.scrollY > threshold;

      if (isScrolled) {
        isNavigatingRef.current = true;

        document.body.style.cursor = "wait";

        scrollToTop(scrollDuration);

        const scrollDistance = window.scrollY;
        const dynamicDelay = Math.min(delay + scrollDistance / SCROLL_DELAY_FACTOR, MAX_DYNAMIC_DELAY);

        setTimeout(() => {
          document.body.style.cursor = "";
          router.push(path);

          setTimeout(() => {
            isNavigatingRef.current = false;
          }, NAVIGATION_RESET_DELAY);
        }, dynamicDelay);
      } else {
        router.push(path);
      }
    },
    [router, scrollToTop, delay, threshold]
  );

  useEffect(() => {
    return () => {
      isNavigatingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      document.body.style.cursor = "";
    };
  }, []);

  return {
    scrollToTop,
    navigateWithScroll,
    isScrolled,
    smoothScrollTo,
  };
}
