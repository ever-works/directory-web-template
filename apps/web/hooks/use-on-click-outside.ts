import { useEffect, useRef, RefObject } from "react";

export function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  handler: (event: MouseEvent | TouchEvent) => void
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;

      if (!el || el.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };
    document.addEventListener("mousedown", listener, { passive: true });
    document.addEventListener("touchstart", listener, { passive: true });
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [handler]);

  return ref;
}
