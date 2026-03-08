'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  Elements,
  CardNumberElement, useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { usePaymentMethods } from '@/hooks/use-payment-methods';
import { useCreateSetupIntentWithCustomParams } from '@/hooks/use-setup-intent';
import {
  StripeCardInput,
  SuccessDisplay,
  ErrorDisplay,
  CardHolderInput,
  SetAsDefaultCheckbox
} from '@/components/ui/stripe-components';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);



const SUCCESS_DISPLAY_DURATION = 1500;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface AddPaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface StripePaymentFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

interface PaymentFormData {
  holderName: string;
  setAsDefault: boolean;
}

interface FormState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Custom hook for managing form state
 */
function useFormState() {
  const [state, setState] = useState<FormState>({
    isLoading: false,
    error: null,
    success: false,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const setSuccess = useCallback((success: boolean) => {
    setState(prev => ({ ...prev, success }));
  }, []);

  const resetState = useCallback(() => {
    setState({ isLoading: false, error: null, success: false });
  }, []);

  return {
    ...state,
    setLoading,
    setError,
    setSuccess,
    resetState,
  };
}

/**
 * Custom hook for managing payment form data
 */
function usePaymentFormData() {
  const [formData, setFormData] = useState<PaymentFormData>({
    holderName: '',
    setAsDefault: false,
  });

  const updateHolderName = useCallback((name: string) => {
    setFormData(prev => ({ ...prev, holderName: name }));
  }, []);

  const updateSetAsDefault = useCallback((isDefault: boolean) => {
    setFormData(prev => ({ ...prev, setAsDefault: isDefault }));
  }, []);

  const resetFormData = useCallback(() => {
    setFormData({ holderName: '', setAsDefault: false });
  }, []);

  return {
    ...formData,
    updateHolderName,
    updateSetAsDefault,
    resetFormData,
  };
}



// ============================================================================
// MAIN FORM COMPONENT
// ============================================================================

/**
 * Enhanced Stripe Payment Form with custom hooks and reusable components
 */
function StripePaymentForm({ onClose, onSuccess }: StripePaymentFormProps) {
  const t = useTranslations('billing');
  const stripe = useStripe();
  const elements = useElements();

  // Custom hooks for state management
  const formState = useFormState();
  const formData = usePaymentFormData();

  // External hooks
  const { createSetupIntentAsync } = useCreateSetupIntentWithCustomParams();
  const { createPaymentMethodAsync } = usePaymentMethods();

  // Memoized validation
  const isFormValid = useMemo(() => {
    return formData.holderName.trim().length > 0 && stripe && elements;
  }, [formData.holderName, stripe, elements]);

  // Form submission handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      formState.setError(t('ERROR_TRY_AGAIN'));
      return;
    }

    if (!isFormValid) {
      formState.setError(t('VALIDATION_CARDHOLDER_REQUIRED'));
      return;
    }

    formState.setLoading(true);
    formState.setError(null);

    try {
      // Create setup intent
      const setupIntentResponse = await createSetupIntentAsync({
        customer_name: formData.holderName,
        set_as_default: formData.setAsDefault
      });

      const client_secret = setupIntentResponse.client_secret;

      // Get card element
      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) {
        throw new Error(t('ERROR_TRY_AGAIN'));
      }

      // Confirm card setup
      const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(client_secret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            name: formData.holderName,
          },
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      // Create payment method
      if (setupIntent?.status === 'succeeded') {
        await createPaymentMethodAsync({
          setupIntentId: setupIntent.id,
          setAsDefault: formData.setAsDefault
        });

        formState.setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, SUCCESS_DISPLAY_DURATION);
      }
    } catch (err: any) {
      formState.setError(err.message || t('ERROR_TRY_AGAIN'));
    } finally {
      formState.setLoading(false);
    }
  }, [
    stripe,
    elements,
    isFormValid,
    formState,
    formData,
    createSetupIntentAsync,
    createPaymentMethodAsync,
    onSuccess,
    onClose,
    t
  ]);

  // Early return for success state
  if (formState.success) {
    return (
      <SuccessDisplay
        title={`${t('ADD_CARD')} - Succès !`}
        description="Votre méthode de paiement a été enregistrée."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {formState.error && <ErrorDisplay error={formState.error} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cardholder Name Input */}
        <CardHolderInput
          value={formData.holderName}
          onChange={formData.updateHolderName}
          disabled={formState.isLoading}
          required
        />

        {/* Stripe Card Input Component */}
        <StripeCardInput disabled={formState.isLoading} theme="light" />

        {/* Set as Default Checkbox */}
        <SetAsDefaultCheckbox
          checked={formData.setAsDefault}
          onChange={formData.updateSetAsDefault}
          disabled={formState.isLoading}
        />

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={formState.isLoading}
          >
            {t('CANCEL')}
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-theme-primary-500 hover:bg-theme-primary-500"
            disabled={formState.isLoading || !isFormValid}
          >
            {formState.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('PROCESSING')}
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                {t('ADD_CARD')}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Composant principal avec Elements wrapper
export function AddPaymentMethodModal({ isOpen, onClose, onSuccess }: AddPaymentMethodModalProps) {
  const t = useTranslations('billing');

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('ADD_PAYMENT_METHOD')}
          </h3>
        </div>

        <Elements stripe={stripePromise}>
          <StripePaymentForm onClose={onClose} onSuccess={onSuccess} />
        </Elements>
      </div>
    </Modal>
  );
}
