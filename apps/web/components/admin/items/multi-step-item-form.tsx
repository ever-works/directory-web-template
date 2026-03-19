"use client";

import { useState, useEffect, useMemo } from 'react';
import { useMultiStepForm } from '@/hooks/use-multi-step-form';
import { StepIndicator, StepNavigation } from '@/components/ui/multi-step-form';
import {
  BasicInfoStep,
  MediaLinksStep,
  ClassificationStep,
  LocationStep,
  ReviewStep,
  type BasicInfoData,
  type MediaLinksData,
  type ClassificationData,
  type LocationStepData,
  type ReviewData
} from './form-steps';
import { ItemData, CreateItemRequest, UpdateItemRequest, ITEM_STATUSES } from '@/lib/types/item';
import { useLocationSettings } from '@/hooks/use-location-settings';
import { useTranslations } from 'next-intl';

interface MultiStepItemFormProps {
  item?: ItemData;
  mode: 'create' | 'edit';
  onSubmit: (data: CreateItemRequest | UpdateItemRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormData {
  basicInfo: BasicInfoData;
  mediaLinks: MediaLinksData;
  classification: ClassificationData;
  location: LocationStepData;
  review: ReviewData;
}

export function MultiStepItemForm({
  item,
  mode,
  onSubmit,
  onCancel,
  isLoading = false
}: MultiStepItemFormProps) {
  const t = useTranslations('admin.ITEM_FORM');
  const { settings: locationSettings } = useLocationSettings();
  const locationEnabled = locationSettings.enabled;

  // Define steps with i18n support — conditionally include location
  const FORM_STEPS = useMemo(() => {
    const steps = [
      {
        id: 'basic-info',
        title: t('STEPS.BASIC_INFO.TITLE'),
        description: t('STEPS.BASIC_INFO.DESCRIPTION')
      },
      {
        id: 'media-links',
        title: t('STEPS.MEDIA_LINKS.TITLE'),
        description: t('STEPS.MEDIA_LINKS.DESCRIPTION')
      },
      {
        id: 'classification',
        title: t('STEPS.CLASSIFICATION.TITLE'),
        description: t('STEPS.CLASSIFICATION.DESCRIPTION')
      },
    ];

    if (locationEnabled) {
      steps.push({
        id: 'location',
        title: t('STEPS.LOCATION.TITLE'),
        description: t('STEPS.LOCATION.DESCRIPTION')
      });
    }

    steps.push({
      id: 'review',
      title: t('STEPS.REVIEW.TITLE'),
      description: t('STEPS.REVIEW.DESCRIPTION')
    });

    return steps;
  }, [t, locationEnabled]);

  // Compute which step number corresponds to each section (1-based)
  const locationStepNumber = locationEnabled
    ? FORM_STEPS.findIndex((s) => s.id === 'location') + 1
    : -1;
  const reviewStepNumber = FORM_STEPS.findIndex((s) => s.id === 'review') + 1;

  // Initialize form data
  const [formData, setFormData] = useState<FormData>({
    basicInfo: {
      id: item?.id || '',
      name: item?.name || '',
      slug: item?.slug || '',
      description: item?.description || ''
    },
    mediaLinks: {
      icon_url: item?.icon_url || '',
      source_url: item?.source_url || ''
    },
    classification: {
      category: Array.isArray(item?.category) ? item.category : [],
      tags: Array.isArray(item?.tags) ? item.tags : []
    },
    location: {
      address: item?.location?.address,
      city: item?.location?.city,
      state: item?.location?.state,
      country: item?.location?.country,
      postal_code: item?.location?.postal_code,
      latitude: item?.location?.latitude,
      longitude: item?.location?.longitude,
      service_area: item?.location?.service_area,
      is_remote: item?.location?.is_remote,
      geocoded_by: item?.location?.geocoded_by,
    },
    review: {
      featured: item?.featured || false,
      status: item?.status || ITEM_STATUSES.DRAFT
    }
  });

  // Step validation states — dynamic based on total steps
  const [stepValidation, setStepValidation] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    for (let i = 1; i <= FORM_STEPS.length; i++) {
      initial[i] = false;
    }
    return initial;
  });

  // Keep stepValidation in sync when FORM_STEPS changes (e.g. locationEnabled loads async)
  useEffect(() => {
    setStepValidation((prev) => {
      const next: Record<number, boolean> = {};
      for (let i = 1; i <= FORM_STEPS.length; i++) {
        next[i] = prev[i] ?? false;
      }
      return next;
    });
  }, [FORM_STEPS.length]);

  // Multi-step form hook
  const {
    currentStep,
    isFirstStep,
    isLastStep,
    completedSteps,
    goToNext,
    goToPrevious,
    goToStep,
    markStepAsCompleted,
    markStepAsIncomplete
  } = useMultiStepForm({
    totalSteps: FORM_STEPS.length,
    onComplete: handleFormSubmit
  });

  // Update form data handlers
  const updateBasicInfo = (data: BasicInfoData) => {
    setFormData(prev => ({ ...prev, basicInfo: data }));
  };

  const updateMediaLinks = (data: MediaLinksData) => {
    setFormData(prev => ({ ...prev, mediaLinks: data }));
  };

  const updateClassification = (data: ClassificationData) => {
    setFormData(prev => ({ ...prev, classification: data }));
  };

  const updateLocation = (data: LocationStepData) => {
    setFormData(prev => ({ ...prev, location: data }));
  };

  const updateReview = (data: ReviewData) => {
    setFormData(prev => ({ ...prev, review: data }));
  };

  // Step validation handlers
  const handleStepValidation = (step: number, isValid: boolean) => {
    setStepValidation(prev => ({ ...prev, [step]: isValid }));

    if (isValid) {
      markStepAsCompleted(step);
    } else {
      markStepAsIncomplete(step);
    }
  };

  // Navigation handlers
  const handleNext = () => {
    const currentStepValid = stepValidation[currentStep];

    if (currentStepValid) {
      goToNext();
    }
  };

  const handlePrevious = () => {
    goToPrevious();
  };

  const handleStepClick = (step: number) => {
    // Only allow navigation to completed steps to maintain validation integrity
    const canNavigate = completedSteps.has(step);
    if (canNavigate) {
      goToStep(step);
    }
  };

  // Form submission
  function handleFormSubmit() {
    const combinedData = {
      ...formData.basicInfo,
      ...formData.mediaLinks,
      ...formData.classification,
      ...formData.review,
      // Include location data if location feature is enabled and data exists
      ...(locationEnabled && hasLocationData(formData.location) ? { location: formData.location } : {}),
    } as CreateItemRequest | UpdateItemRequest;

    onSubmit(combinedData);
  }

  // Update form data when item prop changes (edit mode)
  useEffect(() => {
    if (item && mode === 'edit') {
      setFormData({
        basicInfo: {
          id: item.id,
          name: item.name,
          slug: item.slug,
          description: item.description
        },
        mediaLinks: {
          icon_url: item.icon_url || '',
          source_url: item.source_url
        },
        classification: {
          category: Array.isArray(item.category) ? item.category : [],
          tags: Array.isArray(item.tags) ? item.tags : []
        },
        location: {
          address: item.location?.address,
          city: item.location?.city,
          state: item.location?.state,
          country: item.location?.country,
          postal_code: item.location?.postal_code,
          latitude: item.location?.latitude,
          longitude: item.location?.longitude,
          service_area: item.location?.service_area,
          is_remote: item.location?.is_remote,
          geocoded_by: item.location?.geocoded_by,
        },
        review: {
          featured: item.featured || false,
          status: item.status
        }
      });
    }
  }, [item, mode]);

  const canGoNext = stepValidation[currentStep];
  const canGoPrevious = !isFirstStep && !isLoading;

  return (
    <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/6 overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-r from-theme-primary to-theme-accent px-6 py-4">
        <h2 className="text-xl font-bold text-white">
          {mode === 'create' ? t('TITLE_CREATE') : t('TITLE_EDIT')}
        </h2>
        <p className="text-white/80 text-sm mt-1">
          {mode === 'create' ? t('SUBTITLE_CREATE') : t('SUBTITLE_EDIT')}
        </p>
      </div>

      <div className="p-6 space-y-8">
        {/* Step Indicator */}
        <StepIndicator
          steps={FORM_STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          className="mb-8"
        />

        {/* Form Content */}
        <div className="min-h-[500px]">
          {currentStep === 1 && (
            <BasicInfoStep
              data={formData.basicInfo}
              onChange={updateBasicInfo}
              onValidationChange={(isValid) => handleStepValidation(1, isValid)}
              mode={mode}
            />
          )}

          {currentStep === 2 && (
            <MediaLinksStep
              data={formData.mediaLinks}
              onChange={updateMediaLinks}
              onValidationChange={(isValid) => handleStepValidation(2, isValid)}
            />
          )}

          {currentStep === 3 && (
            <ClassificationStep
              data={formData.classification}
              onChange={updateClassification}
              onValidationChange={(isValid) => handleStepValidation(3, isValid)}
            />
          )}

          {locationEnabled && currentStep === locationStepNumber && (
            <LocationStep
              data={formData.location}
              onChange={updateLocation}
              onValidationChange={(isValid) => handleStepValidation(locationStepNumber, isValid)}
            />
          )}

          {currentStep === reviewStepNumber && (
            <ReviewStep
              data={formData.review}
              onChange={updateReview}
              onValidationChange={(isValid) => handleStepValidation(reviewStepNumber, isValid)}
              basicInfo={formData.basicInfo}
              mediaLinks={formData.mediaLinks}
              classification={formData.classification}
              location={locationEnabled ? formData.location : undefined}
            />
          )}
        </div>

        {/* Navigation */}
        <StepNavigation
          currentStep={currentStep}
          totalSteps={FORM_STEPS.length}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          canGoNext={canGoNext}
          canGoPrevious={canGoPrevious}
          isSubmitting={isLoading}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onCancel={onCancel}
          nextLabel={t('NAVIGATION.NEXT')}
          previousLabel={t('NAVIGATION.PREVIOUS')}
          submitLabel={mode === 'create' ? t('NAVIGATION.CREATE') : t('NAVIGATION.UPDATE')}
          cancelLabel={t('NAVIGATION.CANCEL')}
          stepCounterLabel={t('NAVIGATION.STEP_COUNTER', { current: currentStep, total: FORM_STEPS.length })}
        />
      </div>
    </div>
  );
}

/** Check if location data has any meaningful content */
function hasLocationData(location: LocationStepData): boolean {
  if (location.is_remote === true) return true;
  if (location.latitude !== undefined && location.longitude !== undefined) return true;
  if (location.address?.trim()) return true;
  if (location.city?.trim()) return true;
  if (location.country?.trim()) return true;
  return false;
}
