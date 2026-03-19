"use client";

import { useMemo } from 'react';
import { cn } from '@heroui/react';
import { CheckCircle, XCircle } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

interface PasswordCriteria {
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const criteria: PasswordCriteria[] = useMemo(() => [
    {
      label: "At least 8 characters",
      test: (pwd) => pwd.length >= 8,
      met: password.length >= 8,
    },
    {
      label: "At least one uppercase letter",
      test: (pwd) => /[A-Z]/.test(pwd),
      met: /[A-Z]/.test(password),
    },
    {
      label: "At least one lowercase letter",
      test: (pwd) => /[a-z]/.test(pwd),
      met: /[a-z]/.test(password),
    },
    {
      label: "At least one number",
      test: (pwd) => /\d/.test(pwd),
      met: /\d/.test(password),
    },
    {
      label: "At least one special character",
      test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ], [password]);

  const metCriteria = criteria.filter(c => c.met).length;
  const strength = metCriteria / criteria.length;

  const getStrengthColor = () => {
    if (strength < 0.4) return 'bg-red-500';
    if (strength < 0.7) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (strength < 0.4) return 'Weak';
    if (strength < 0.7) return 'Medium';
    return 'Strong';
  };

  if (!password) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Barre de progression */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Password strength
          </span>
          <span className={cn(
            'text-xs font-semibold px-2 py-1 rounded-full',
            strength < 0.4 ? 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30' :
            strength < 0.7 ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30' :
            'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30'
          )}>
            {getStrengthLabel()}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              getStrengthColor()
            )}
            style={{ width: `${strength * 100}%` }}
          />
        </div>
      </div>

      {/* Criteria list */}
      <div className="space-y-2">
        {criteria.map((criterion, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center space-x-2 text-xs transition-colors duration-200',
              criterion.met 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {criterion.met ? (
              <CheckCircle className="w-3 h-3 text-green-500" />
            ) : (
              <XCircle className="w-3 h-3 text-gray-400" />
            )}
            <span>{criterion.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook pour calculer la force du mot de passe
export function usePasswordStrength(password: string) {
  return useMemo(() => {
    const criteria = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password),
    ];

    const metCriteria = criteria.filter(Boolean).length;
    const strength = metCriteria / criteria.length;

    return {
      strength,
      isWeak: strength < 0.4,
      isMedium: strength >= 0.4 && strength < 0.7,
      isStrong: strength >= 0.7,
      metCriteria,
      totalCriteria: criteria.length,
    };
  }, [password]);
}
