import { useState, useEffect } from 'react';
import { PaymentFlow } from '@/lib/payment/types/payment';

// Helper function to check if we're on the client side
const isClient = typeof window !== 'undefined';

// Helper function to safely access localStorage
const getLocalStorage = (key: string): string | null => {
  if (!isClient) return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to get localStorage item '${key}':`, error);
    return null;
  }
};

// Helper function to safely set localStorage
const setLocalStorage = (key: string, value: string): boolean => {
  if (!isClient) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Failed to set localStorage item '${key}':`, error);
    return false;
  }
};

// Helper function to safely remove localStorage
const removeLocalStorage = (key: string): boolean => {
  if (!isClient) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Failed to remove localStorage item '${key}':`, error);
    return false;
  }
};

interface UseLocalStorageOptions {
  defaultValue?: string;
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
}

export function useLocalStorage<T = string>(
  key: string,
  options: UseLocalStorageOptions = {}
) {
  const {
    defaultValue,
    serialize = JSON.stringify,
    deserialize = JSON.parse
  } = options;

  // Initialize state with default value or stored value
  const [storedValue, setStoredValue] = useState<T | null>(() => {
    if (!isClient) return defaultValue as T;
    
    try {
      const item = getLocalStorage(key);
      if (item === null) return defaultValue as T;
      return deserialize(item);
    } catch (error) {
      console.warn(`Failed to deserialize localStorage item '${key}':`, error);
      return defaultValue as T;
    }
  });

  // Function to set value in localStorage and state
  const setValue = (value: T | ((val: T | null) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save to state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      if (valueToStore === null) {
        removeLocalStorage(key);
      } else {
        setLocalStorage(key, serialize(valueToStore));
      }
    } catch (error) {
      console.warn(`Failed to set localStorage item '${key}':`, error);
    }
  };

  // Function to remove value from localStorage and state
  const removeValue = () => {
    setStoredValue(null);
    removeLocalStorage(key);
  };

  // Listen for changes to localStorage from other tabs/windows
  useEffect(() => {
    if (!isClient) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(deserialize(e.newValue));
        } catch (error) {
          console.warn(`Failed to deserialize localStorage item '${key}' from storage event:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, deserialize]);

  return [storedValue, setValue, removeValue] as const;
}

// Specialized hook for payment flow
export function usePaymentFlowStorage() {
  return useLocalStorage<PaymentFlow>('selectedPaymentFlow', {
    defaultValue: PaymentFlow.PAY_AT_END,
    serialize: (value) => value,
    deserialize: (value) => value as PaymentFlow
  });
} 