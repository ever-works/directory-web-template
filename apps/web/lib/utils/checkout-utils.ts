import { toast } from "sonner";

export interface CheckoutWindowOptions {
  url: string;
  windowName?: string;
  windowFeatures?: string;
  fallbackToRedirect?: boolean;
}


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
