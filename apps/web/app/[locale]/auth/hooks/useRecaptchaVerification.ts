import { useMutation } from '@tanstack/react-query';


interface RecaptchaVerificationResponse {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  error_codes?: string[];
  error?: string;
}

const verifyRecaptcha = async (token: string): Promise<RecaptchaVerificationResponse> => {
  const response = await fetch('/api/verify-recaptcha', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const useRecaptchaVerification = () => {
  return useMutation({
    mutationFn: verifyRecaptcha,
    mutationKey: ['recaptcha-verification'],
    onSuccess: (data) => {
      console.log('ReCAPTCHA verification successful:', data);
    },
    onError: (error) => {
      console.error('ReCAPTCHA verification failed:', error);
    },
  });
};

export const useAutoRecaptchaVerification = () => {
  const mutation = useRecaptchaVerification();
  const verifyToken = async (token: string | null): Promise<boolean> => {
    if (!token) {
      return false;
    }
    try {
      const result = await mutation.mutateAsync(token);
      return result.success;
    } catch (error) {
      console.error('Auto verification failed:', error);
      return false;
    }
  };
  return {
    verifyToken,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
};
