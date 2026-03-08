import { useEffect, useRef } from 'react';

/**
 * Custom hook to create a portal container for rendering components outside the DOM hierarchy
 *
 * @param id - Optional ID for the portal root element (default: 'portal-root')
 * @returns HTMLDivElement that can be used as a portal target
 *
 * @example
 * ```tsx
 * const portalTarget = usePortal('my-portal');
 *
 * return (
 *   <>
 *     <button>Trigger</button>
 *     {portalTarget && ReactDOM.createPortal(
 *       <div>Portal content</div>,
 *       portalTarget
 *     )}
 *   </>
 * );
 * ```
 */
export function usePortal(id = 'portal-root') {
  const portalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create or get existing portal root
    let portalRoot = document.getElementById(id) as HTMLDivElement;

    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.id = id;
      document.body.appendChild(portalRoot);
    }

    // Create portal container for this specific instance
    const portalContainer = document.createElement('div');
    portalRoot.appendChild(portalContainer);
    portalRef.current = portalContainer;

    // Cleanup: remove portal container when component unmounts
    return () => {
      if (portalContainer && portalRoot.contains(portalContainer)) {
        portalRoot.removeChild(portalContainer);
      }
    };
  }, [id]);

  return portalRef.current;
}
