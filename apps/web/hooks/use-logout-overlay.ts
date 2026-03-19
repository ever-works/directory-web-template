import { useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import { LOGOUT_OVERLAY_CONFIG } from "@/constants/profile-button.constants";
import { getThemeColors } from "@/utils/profile-button.utils";

export function useLogoutOverlay() {
  // Use ref to store observer to prevent memory leaks
  const observerRef = useRef<MutationObserver | null>(null);
  // Prevent multiple concurrent logout flows
  const isLoggingOutRef = useRef<boolean>(false);

  const createOverlayElement = (
    colors: ReturnType<typeof getThemeColors>,
    texts?: { title?: string; description?: string }
  ) => {
    const overlay = document.createElement('div');
    overlay.id = LOGOUT_OVERLAY_CONFIG.ID;
    overlay.setAttribute('data-logout-root', '');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'logout-overlay-title');
    
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${colors.background};
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: ${LOGOUT_OVERLAY_CONFIG.Z_INDEX};
      backdrop-filter: blur(8px);
      animation: fadeIn ${LOGOUT_OVERLAY_CONFIG.ANIMATION_DURATION.FADE_IN}ms ease-out;
    `;

    const card = document.createElement('div');
    card.setAttribute('data-logout-card', '');
    card.style.cssText = `
      background: ${colors.cardBg};
      padding: ${LOGOUT_OVERLAY_CONFIG.SIZES.PADDING};
      border-radius: ${LOGOUT_OVERLAY_CONFIG.SIZES.BORDER_RADIUS};
      box-shadow: ${colors.cardShadow};
      text-align: center;
      max-width: ${LOGOUT_OVERLAY_CONFIG.SIZES.CARD_MAX_WIDTH}px;
      animation: slideInScale ${LOGOUT_OVERLAY_CONFIG.ANIMATION_DURATION.SLIDE_IN}ms cubic-bezier(0.34, 1.56, 0.64, 1);
      border: 1px solid ${colors.border};
    `;

    const spinner = document.createElement('div');
    spinner.setAttribute('data-logout-spinner', '');
    spinner.setAttribute('role', 'status');
    spinner.setAttribute('aria-live', 'polite');
    spinner.setAttribute('aria-busy', 'true');
    spinner.style.cssText = `
      width: ${LOGOUT_OVERLAY_CONFIG.SIZES.SPINNER}px;
      height: ${LOGOUT_OVERLAY_CONFIG.SIZES.SPINNER}px;
      border: 3px solid ${colors.spinnerBorder};
      border-top: 3px solid ${LOGOUT_OVERLAY_CONFIG.COLORS.SPINNER_ACCENT};
      border-radius: 50%;
      animation: spin ${LOGOUT_OVERLAY_CONFIG.ANIMATION_DURATION.SPIN}ms linear infinite;
      margin: 0 auto 1.5rem auto;
      box-shadow: 0 4px 12px ${LOGOUT_OVERLAY_CONFIG.COLORS.SPINNER_SHADOW};
    `;

    const title = document.createElement('h3');
    title.setAttribute('data-logout-title', '');
    title.textContent = texts?.title ?? 'Signing Out';
    title.id = 'logout-overlay-title';
    title.style.cssText = `
      margin: 0 0 0.75rem 0;
      font-size: 1.375rem;
      font-weight: 700;
      color: ${colors.titleColor};
      letter-spacing: -0.025em;
    `;

    const text = document.createElement('p');
    text.setAttribute('data-logout-text', '');
    text.textContent = texts?.description ?? 'Please wait while we securely log you out and clear your session...';
    text.style.cssText = `
      margin: 0;
      color: ${colors.textColor};
      font-size: 0.9375rem;
      line-height: 1.6;
      font-weight: 500;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideInScale {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;

    card.appendChild(spinner);
    card.appendChild(title);
    card.appendChild(text);
    overlay.appendChild(card);
    overlay.appendChild(style);

    return overlay;
  };

  const handleLogout = useCallback(async (texts?: { title?: string; description?: string }) => {
    // Ensure we're on the client side
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      // In SSR, do nothing; signOut requires a browser environment.
      return;
    }

    // No-op if a logout flow is already in progress or an overlay exists
    if (isLoggingOutRef.current || document.getElementById(LOGOUT_OVERLAY_CONFIG.ID)) {
      return;
    }
    isLoggingOutRef.current = true;

    // Create enhanced overlay with better animations and dark mode support
    const prevActiveElement = document.activeElement as (HTMLElement | null);
    const colors = getThemeColors();
    const overlay = createOverlayElement(colors, texts);
    document.body.appendChild(overlay);
    // Make overlay programmatically focusable and focus it
    (overlay as HTMLDivElement).tabIndex = -1;
    (overlay as HTMLDivElement).focus();

    // Add theme change listener to update overlay colors dynamically
    const updateOverlayTheme = () => {
      const overlayElement = document.getElementById(LOGOUT_OVERLAY_CONFIG.ID);
      if (overlayElement) {
        const colors = getThemeColors();
        // Update backdrop as well
        (overlayElement as HTMLElement).style.background = colors.background;
        const overlayDiv = overlayElement.querySelector('[data-logout-card]') as HTMLElement;
        const titleElement = overlayElement.querySelector('[data-logout-title]') as HTMLElement;
        const textElement = overlayElement.querySelector('[data-logout-text]') as HTMLElement;
        const spinnerElement = overlayElement.querySelector('[data-logout-spinner]') as HTMLElement;
        
        if (overlayDiv) {
          overlayDiv.style.background = colors.cardBg;
          overlayDiv.style.boxShadow = colors.cardShadow;
          overlayDiv.style.border = `1px solid ${colors.border}`;
        }
        if (titleElement) titleElement.style.color = colors.titleColor;
        if (textElement) textElement.style.color = colors.textColor;
        if (spinnerElement) {
          spinnerElement.style.border = `3px solid ${colors.spinnerBorder}`;
          (spinnerElement.style as CSSStyleDeclaration).borderTopColor = LOGOUT_OVERLAY_CONFIG.COLORS.SPINNER_ACCENT;
        }
      }
    };

    // Clean up previous observer if exists
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Listen for theme changes
    observerRef.current = new MutationObserver(updateOverlayTheme);
    observerRef.current.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });

    try {
      await signOut({ redirect: false });
      window.location.href = "/";
    } catch (error) {
      console.error('Logout error:', error);
      const overlayElement = document.getElementById(LOGOUT_OVERLAY_CONFIG.ID);
      if (overlayElement && document.body.contains(overlayElement)) {
        document.body.removeChild(overlayElement);
      }
    } finally {
      // Clean up observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      // Remove overlay if it still exists
      const overlayElement = document.getElementById(LOGOUT_OVERLAY_CONFIG.ID);
      if (overlayElement && document.body.contains(overlayElement)) {
        document.body.removeChild(overlayElement);
      }
      // Restore focus to the previously focused element
      prevActiveElement?.focus?.();
      isLoggingOutRef.current = false;
    }
  }, []);

  return {
    handleLogout,
  };
}
