"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Save, X, ChevronLeft, ChevronRight } from "lucide-react";
import type {
  CreateClientRequest,
  UpdateClientRequest
} from "@/lib/types/client";
import type { ClientProfileWithAuth } from "@/lib/db/queries";
import { CLIENT_VALIDATION } from "@/lib/types/client";
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import {
  BasicInfoStep,
  ProfileStep,
  ContactStep,
  PreferencesStep,
  type FormData
} from './form-steps';

interface ClientFormProps {
  client?: ClientProfileWithAuth;
  onSubmit: (data: CreateClientRequest | UpdateClientRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

type FormStep = 1 | 2 | 3 | 4;

export function ClientForm({ client, onSubmit, onCancel, isLoading = false, mode }: ClientFormProps) {
  const t = useTranslations('admin.CLIENT_FORM');

  // Multi-step state
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const totalSteps = 4;

  // Extract long className strings into constants for better maintainability
  const containerClasses = "bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden";
  const headerClasses = "bg-linear-to-r from-theme-primary to-theme-accent px-6 py-4";
  const formClasses = "p-6 space-y-6";
  const actionsClasses = "flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700";

  // Helper function to construct form defaults based on client data and mode
  const defaultsFor = (m: 'create' | 'edit', c?: ClientProfileWithAuth): FormData => ({
    email: m === 'edit' ? (c?.email ?? '') : '',
    displayName: c?.displayName ?? '',
    username: c?.username ?? '',
    bio: c?.bio ?? '',
    jobTitle: c?.jobTitle ?? '',
    company: c?.company ?? '',
    industry: c?.industry ?? '',
    phone: c?.phone ?? '',
    website: c?.website ?? '',
    location: c?.location ?? '',
    accountType: (c?.accountType ?? 'individual') as 'individual' | 'business' | 'enterprise',
    timezone: c?.timezone ?? 'UTC',
    language: c?.language ?? 'en',
  });

  const [formData, setFormData] = useState<FormData>(() => defaultsFor(mode, client));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when client prop changes
  useEffect(() => {
    setFormData(defaultsFor(mode, client));
    setErrors({});
  }, [client, mode]);

  // Helper function to collect errors for a specific step without setting state
  const collectStepErrors = (step: FormStep): Record<string, string> => {
    const stepErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Basic Information
        if (mode === 'create') {
          if (!formData.email.trim()) {
            stepErrors.email = t('ERRORS.EMAIL_REQUIRED');
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            stepErrors.email = t('ERRORS.EMAIL_INVALID');
          }
        }

        if (formData.displayName && formData.displayName.trim().length < CLIENT_VALIDATION.DISPLAY_NAME_MIN_LENGTH) {
          stepErrors.displayName = t('ERRORS.DISPLAY_NAME_MIN_LENGTH', { min: CLIENT_VALIDATION.DISPLAY_NAME_MIN_LENGTH });
        } else if (formData.displayName && formData.displayName.trim().length > CLIENT_VALIDATION.DISPLAY_NAME_MAX_LENGTH) {
          stepErrors.displayName = t('ERRORS.DISPLAY_NAME_MAX_LENGTH', { max: CLIENT_VALIDATION.DISPLAY_NAME_MAX_LENGTH });
        }

        if (formData.username && formData.username.trim().length < CLIENT_VALIDATION.USERNAME_MIN_LENGTH) {
          stepErrors.username = t('ERRORS.USERNAME_MIN_LENGTH', { min: CLIENT_VALIDATION.USERNAME_MIN_LENGTH });
        } else if (formData.username && formData.username.trim().length > CLIENT_VALIDATION.USERNAME_MAX_LENGTH) {
          stepErrors.username = t('ERRORS.USERNAME_MAX_LENGTH', { max: CLIENT_VALIDATION.USERNAME_MAX_LENGTH });
        }
        break;

      case 2: // Profile Details
        if (formData.bio && formData.bio.trim().length > CLIENT_VALIDATION.BIO_MAX_LENGTH) {
          stepErrors.bio = t('ERRORS.BIO_MAX_LENGTH', { max: CLIENT_VALIDATION.BIO_MAX_LENGTH });
        }

        if (formData.jobTitle && formData.jobTitle.trim().length > CLIENT_VALIDATION.JOB_TITLE_MAX_LENGTH) {
          stepErrors.jobTitle = t('ERRORS.JOB_TITLE_MAX_LENGTH', { max: CLIENT_VALIDATION.JOB_TITLE_MAX_LENGTH });
        }

        if (formData.company && formData.company.trim().length > CLIENT_VALIDATION.COMPANY_MAX_LENGTH) {
          stepErrors.company = t('ERRORS.COMPANY_MAX_LENGTH', { max: CLIENT_VALIDATION.COMPANY_MAX_LENGTH });
        }

        if (formData.industry && formData.industry.trim().length > CLIENT_VALIDATION.INDUSTRY_MAX_LENGTH) {
          stepErrors.industry = t('ERRORS.INDUSTRY_MAX_LENGTH', { max: CLIENT_VALIDATION.INDUSTRY_MAX_LENGTH });
        }
        break;

      case 3: // Contact & Location
        if (formData.phone && formData.phone.trim().length > CLIENT_VALIDATION.PHONE_MAX_LENGTH) {
          stepErrors.phone = t('ERRORS.PHONE_MAX_LENGTH', { max: CLIENT_VALIDATION.PHONE_MAX_LENGTH });
        }

        if (formData.website && formData.website.trim().length > CLIENT_VALIDATION.WEBSITE_MAX_LENGTH) {
          stepErrors.website = t('ERRORS.WEBSITE_MAX_LENGTH', { max: CLIENT_VALIDATION.WEBSITE_MAX_LENGTH });
        }

        if (formData.location && formData.location.trim().length > CLIENT_VALIDATION.LOCATION_MAX_LENGTH) {
          stepErrors.location = t('ERRORS.LOCATION_MAX_LENGTH', { max: CLIENT_VALIDATION.LOCATION_MAX_LENGTH });
        }
        break;

      case 4: // Preferences
        // No specific validation for preferences
        break;
    }

    return stepErrors;
  };

  // Validate specific step
  const validateStep = (step: FormStep): boolean => {
    const stepErrors = collectStepErrors(step);
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  // Validate entire form (aggregates errors from all steps)
  const validateForm = (): boolean => {
    let isValid = true;
    const aggregatedErrors: Record<string, string> = {};
    let firstInvalidStep: FormStep | null = null;

    for (let step = 1; step <= totalSteps; step++) {
      const currentStepErrors = collectStepErrors(step as FormStep);

      if (Object.keys(currentStepErrors).length > 0) {
        isValid = false;
        if (!firstInvalidStep) {
          firstInvalidStep = step as FormStep;
        }
      }

      Object.assign(aggregatedErrors, currentStepErrors);
    }

    setErrors(aggregatedErrors);

    if (firstInvalidStep) {
      setCurrentStep(firstInvalidStep);
    }

    return isValid;
  };

  // Navigation handlers
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps) as FormStep);
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1) as FormStep);
    setErrors({}); // Clear errors when going back
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (mode === 'create') {
        const createData: CreateClientRequest = {
          email: formData.email,
          displayName: formData.displayName,
          username: formData.username,
          bio: formData.bio,
          jobTitle: formData.jobTitle,
          company: formData.company,
          industry: formData.industry,
          phone: formData.phone,
          website: formData.website,
          location: formData.location,
          accountType: formData.accountType,
          timezone: formData.timezone,
          language: formData.language,
        };
        await onSubmit(createData);
      } else {
        const updateData: UpdateClientRequest = {
          id: client?.id || '',
          displayName: formData.displayName,
          username: formData.username,
          bio: formData.bio,
          jobTitle: formData.jobTitle,
          company: formData.company,
          industry: formData.industry,
          phone: formData.phone,
          website: formData.website,
          location: formData.location,
          accountType: formData.accountType,
          timezone: formData.timezone,
          language: formData.language,
        };
        await onSubmit(updateData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const onInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Step labels
  const getStepLabel = (step: FormStep): string => {
    switch (step) {
      case 1:
        return t('STEPS.BASIC_INFO');
      case 2:
        return t('STEPS.PROFILE');
      case 3:
        return t('STEPS.CONTACT');
      case 4:
        return t('STEPS.PREFERENCES');
      default:
        return '';
    }
  };

  // Render current step
  const renderStep = () => {
    const stepProps = { formData, errors, onInputChange, mode };

    switch (currentStep) {
      case 1:
        return <BasicInfoStep {...stepProps} />;
      case 2:
        return <ProfileStep {...stepProps} />;
      case 3:
        return <ContactStep {...stepProps} />;
      case 4:
        return <PreferencesStep {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className={headerClasses}>
        <h2 className="text-xl font-bold text-white">
          {mode === 'create' ? t('TITLE_CREATE') : t('TITLE_EDIT')}
        </h2>
        <p className="text-white/80 text-sm mt-1">
          {mode === 'create' ? t('SUBTITLE_CREATE') : t('SUBTITLE_EDIT')}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex items-center flex-col md:flex-row md:space-x-2 flex-1">
                <div
                  className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                    currentStep === step
                      ? "bg-theme-primary text-white"
                      : currentStep > step
                      ? "bg-green-500 text-white"
                      : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                  )}
                >
                  {step}
                </div>
                <span
                  className={clsx(
                    "text-xs md:text-sm font-medium mt-1 md:mt-0",
                    currentStep === step
                      ? "text-theme-primary"
                      : currentStep > step
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400"
                  )}
                >
                  {getStepLabel(step as FormStep)}
                </span>
              </div>
              {step < 4 && (
                <div
                  className={clsx(
                    "hidden md:block h-0.5 flex-1 mx-2 transition-colors",
                    currentStep > step
                      ? "bg-green-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className={formClasses}>
        {/* Render Current Step */}
        {renderStep()}

        {/* Form Actions */}
        <div className={actionsClasses}>
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
            )}
            {currentStep === 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                {t('CANCEL')}
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            {currentStep < totalSteps && (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isLoading}
                className="flex items-center gap-2 bg-linear-to-r from-theme-primary to-theme-accent hover:from-theme-primary/90 hover:to-theme-accent/90 text-white"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
            {currentStep === totalSteps && (
              <Button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 bg-linear-to-r from-theme-primary to-theme-accent hover:from-theme-primary/90 hover:to-theme-accent/90 text-white"
              >
                <Save className="w-4 h-4" />
                {mode === 'create' ? t('CREATE_CLIENT') : t('UPDATE_CLIENT')}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
