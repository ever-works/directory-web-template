import { toast } from "sonner";

export interface CheckoutWindowOptions {
  url: string;
  windowName?: string;
  windowFeatures?: string;
  fallbackToRedirect?: boolean;
}


/**
 * Open a checkout URL in a new tab, with security defaults and a
 * popup-blocker fallback.
 *
 * **Don't drop the `noopener,noreferrer` default.** It does two
 * load-bearing security jobs:
 *  - `noopener`: severs `window.opener` on the new tab so the
 *    checkout origin can't `window.opener.location = ...` and
 *    redirect the parent (the classic reverse-tabnabbing attack).
 *  - `noreferrer`: stops the browser sending the parent's URL as
 *    the Referer header to the checkout host (privacy + avoids
 *    leaking internal route params into upstream analytics).
 *
 * Behaviour:
 *  - SSR-safe: returns `false` immediately when `window` is undefined.
 *  - Popup-blocked: if `window.open` returns `null` (blocker), and
 *    `fallbackToRedirect` is true (default), the **current** tab
 *    navigates to `url` instead. Set `fallbackToRedirect: false` to
 *    surface the failure to the caller and let them handle it.
 *  - `newWindow.focus()` is wrapped in try/catch because some
 *    browsers throw cross-origin errors when the new tab is on a
 *    different document yet.
 *
 * Returns `true` if the new tab opened OR the fallback redirect
 * fired; `false` if the popup was blocked AND fallback was disabled.
 */
export function openCheckoutInNewTab(options: CheckoutWindowOptions): boolean {
  const {
    url,
    windowName = '_blank',
    windowFeatures = 'noopener,noreferrer',
    fallbackToRedirect = true
  } = options;

  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const newWindow = window.open(url, windowName, windowFeatures);
    
    if (!newWindow) {
      console.warn('Popup blocked by browser');
      
      if (fallbackToRedirect) {
        window.location.href = url;
        return true;
      }
      
      return false;
    }
    try {
      newWindow.focus();
    } catch (focusError) {
      console.warn('Could not focus new window:', focusError);
    }

    return true;
  } catch {
    if (fallbackToRedirect) {
      window.location.href = url;
      return true;
    } 
    return false;
  }
}


export function openCheckoutWithErrorHandling(
  url: string,
  onError?: (error: string) => void
): boolean {
  const success = openCheckoutInNewTab({ url });
  
  if (!success && onError) {
    onError('Unable to open checkout. Please check your popup blocker settings.');
  }
  
  return success;
}

export function createCheckoutClickHandler(
  checkoutUrl: string,
  options?: {
    onSuccess?: () => void;
    onError?: (error: string) => void;
    showAlert?: boolean;
  }
) {
  return () => {
    const success = openCheckoutWithErrorHandling(checkoutUrl, options?.onError);
    
    if (success && options?.onSuccess) {
      options.onSuccess();
    }
    
    if (!success && options?.showAlert) {
      toast.error('Unable to open checkout. Please try again or contact support.');
    }
  };
}
