"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
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

  // Update form data handlers. They and the validation handlers below keep one identity across renders: each step
  // reports its validity from an effect that depends on them, so a new function on every render re-ran that effect,
  // whose report re-rendered this form, without end ("Maximum update depth exceeded").
  const updateBasicInfo = useCallback((data: BasicInfoData) => {
    setFormData(prev => ({ ...prev, basicInfo: data }));
  }, []);

  const updateMediaLinks = useCallback((data: MediaLinksData) => {
    setFormData(prev => ({ ...prev, mediaLinks: data }));
  }, []);

  const updateClassification = useCallback((data: ClassificationData) => {
    setFormData(prev => ({ ...prev, classification: data }));
  }, []);

  const updateLocation = useCallback((data: LocationStepData) => {
    setFormData(prev => ({ ...prev, location: data }));
  }, []);

  const updateReview = useCallback((data: ReviewData) => {
    setFormData(prev => ({ ...prev, review: data }));
  }, []);

  // Step validation handlers. An unchanged report keeps the previous state, so it does not re-render the form.
  const handleStepValidation = useCallback((step: number, isValid: boolean) => {
    setStepValidation(prev => (prev[step] === isValid ? prev : { ...prev, [step]: isValid }));

    if (isValid) {
      markStepAsCompleted(step);
    } else {
      markStepAsIncomplete(step);
    }
  }, [markStepAsCompleted, markStepAsIncomplete]);

  const handleBasicInfoValidation = useCallback(
    (isValid: boolean) => handleStepValidation(1, isValid),
    [handleStepValidation]
  );
  const handleMediaLinksValidation = useCallback(
    (isValid: boolean) => handleStepValidation(2, isValid),
    [handleStepValidation]
  );
  const handleClassificationValidation = useCallback(
    (isValid: boolean) => handleStepValidation(3, isValid),
    [handleStepValidation]
  );
  const handleLocationValidation = useCallback(
    (isValid: boolean) => handleStepValidation(locationStepNumber, isValid),
    [handleStepValidation, locationStepNumber]
  );
  const handleReviewValidation = useCallback(
    (isValid: boolean) => handleStepValidation(reviewStepNumber, isValid),
    [handleStepValidation, reviewStepNumber]
  );

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

  // Rejecting an item here is a review decision its submitter reads, so it needs a reason, like the reject
  // dialog (PUT /api/admin/items/{id} answers 400 without one). Editing an item already rejected does not.
  const rejectionReasonRequired =
    mode === 'edit' && formData.review.status === ITEM_STATUSES.REJECTED && item?.status !== ITEM_STATUSES.REJECTED;

  // Form submission
  function handleFormSubmit() {
    const { review_notes: reviewNotes, ...review } = formData.review;
    const combinedData = {
      ...formData.basicInfo,
      ...formData.mediaLinks,
      ...formData.classification,
      ...review,
      // Only that rejection sends the reason; other saves leave the stored review notes as they are
      ...(rejectionReasonRequired ? { review_notes: reviewNotes } : {}),
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
      <div className="dark:bg-white/6 bg-white px-6 py-4">
        <h2 className="text-base font-bold text-white">
          {mode === 'create' ? t('TITLE_CREATE') : t('TITLE_EDIT')}
        </h2>
        <p className="text-white/80 text-xs mt-1">
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
              onValidationChange={handleBasicInfoValidation}
              mode={mode}
            />
          )}

          {currentStep === 2 && (
            <MediaLinksStep
              data={formData.mediaLinks}
              onChange={updateMediaLinks}
              onValidationChange={handleMediaLinksValidation}
            />
          )}

          {currentStep === 3 && (
            <ClassificationStep
              data={formData.classification}
              onChange={updateClassification}
              onValidationChange={handleClassificationValidation}
            />
          )}

          {locationEnabled && currentStep === locationStepNumber && (
            <LocationStep
              data={formData.location}
              onChange={updateLocation}
              onValidationChange={handleLocationValidation}
            />
          )}

          {currentStep === reviewStepNumber && (
            <ReviewStep
              data={formData.review}
              onChange={updateReview}
              onValidationChange={handleReviewValidation}
              rejectionReasonRequired={rejectionReasonRequired}
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
