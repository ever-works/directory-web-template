"use client";

import { useState, useEffect, useCallback } from 'react';
import { StepContainer } from '@/components/ui/multi-step-form';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ExternalLink, Upload, Image as ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface MediaLinksData {
  icon_url: string;
  source_url: string;
}

interface MediaLinksStepProps {
  data: MediaLinksData;
  onChange: (data: MediaLinksData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const URL_PATTERN = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}(?:\.[a-zA-Z0-9()]{1,6})?\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;

export function MediaLinksStep({
  data,
  onChange,
  onValidationChange
}: MediaLinksStepProps) {
  const t = useTranslations('admin.ITEM_FORM');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState<string>('');
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const validateField = useCallback((field: keyof MediaLinksData, value: string): string => {
    if (!value.trim()) {
      if (field === 'source_url') {
        return t('ERRORS.SOURCE_URL_REQUIRED');
      }
      // icon_url is optional
      return '';
    }

    if (!URL_PATTERN.test(value)) {
      return field === 'icon_url'
        ? t('ERRORS.ICON_URL_INVALID')
        : t('ERRORS.SOURCE_URL_INVALID');
    }

    return '';
  }, [t]);

  const validateAllFields = useCallback((): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    (Object.keys(data) as Array<keyof MediaLinksData>).forEach(field => {
      const error = validateField(field, data[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    return newErrors;
  }, [data, validateField]);

  const handleBlur = (field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
  };

  const handleFieldChange = (field: keyof MediaLinksData, value: string) => {
    const newData = { ...data, [field]: value };
    onChange(newData);
    setTouchedFields(prev => new Set(prev).add(field));

    // Update preview image for icon_url
    if (field === 'icon_url') {
      const error = validateField(field, value);
      if (value && !error && URL_PATTERN.test(value)) {
        setPreviewImage(value);
      } else {
        setPreviewImage('');
      }
    }
  };

  const handleImageLoad = () => {
    // Image loaded successfully, remove any previous errors
    const newErrors = { ...errors };
    delete newErrors.icon_url;
    setErrors(newErrors);
  };

  const handleImageError = () => {
    if (data.icon_url) {
      setErrors(prev => ({
        ...prev,
        icon_url: t('ERRORS.ICON_URL_LOAD_FAILED')
      }));
      setPreviewImage('');
    }
  };

  // Validate on data change and report validity
  useEffect(() => {
    const allErrors = validateAllFields();

    // Only show errors for touched fields
    const visibleErrors: Record<string, string> = {};
    Object.keys(allErrors).forEach(field => {
      if (touchedFields.has(field)) {
        visibleErrors[field] = allErrors[field];
      }
    });

    setErrors(visibleErrors);
    onValidationChange(Object.keys(allErrors).length === 0);
  }, [data, touchedFields, onValidationChange, validateAllFields]);

  // Set initial preview image
  useEffect(() => {
    if (data.icon_url && URL_PATTERN.test(data.icon_url)) {
      setPreviewImage(data.icon_url);
    } else {
      setPreviewImage('');
    }
  }, [data.icon_url]);

  return (
    <StepContainer
      title={t('STEPS.MEDIA_LINKS.TITLE')}
      description={t('STEPS.MEDIA_LINKS.DESCRIPTION')}
    >
      <div className="space-y-6">
        {/* Icon URL Field */}
        <div className="space-y-2">
          <Label htmlFor="icon_url" className="text-sm font-medium">
            {t('FIELDS.ICON_URL.LABEL')}
            <span className="text-gray-500 ml-1">(Optional)</span>
          </Label>

          <div className="flex items-start gap-4">
            {/* URL Input */}
            <div className="flex-1 space-y-2">
              <input
                id="icon_url"
                type="url"
                value={data.icon_url}
                onChange={(e) => handleFieldChange('icon_url', e.target.value)}
                onBlur={() => handleBlur('icon_url')}
                placeholder={t('FIELDS.ICON_URL.PLACEHOLDER')}
                className={`w-full px-3 py-2 border rounded-md text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.icon_url
                    ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              />
              {errors.icon_url && (
                <p className="text-sm text-red-600">{errors.icon_url}</p>
              )}
              <p className="text-xs text-gray-500">{t('FIELDS.ICON_URL.HELP')}</p>
            </div>

            {/* Icon Preview */}
            <div className="w-16 h-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Icon preview"
                  className="w-12 h-12 object-contain rounded-sm"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              ) : (
                <ImageIcon className="w-6 h-6 text-gray-400" />
              )}
            </div>
          </div>

          {/* Upload Button Placeholder */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-gray-600"
            disabled
          >
            <Upload className="w-4 h-4 mr-2" />
            {t('FIELDS.ICON_URL.UPLOAD_BUTTON')} (Coming Soon)
          </Button>
        </div>

        {/* Source URL Field */}
        <div className="space-y-2">
          <Label htmlFor="source_url" className="text-sm font-medium">
            {t('FIELDS.SOURCE_URL.LABEL')} <span className="text-red-500">*</span>
          </Label>

          <div className="relative">
            <input
              id="source_url"
              type="url"
              value={data.source_url}
              onChange={(e) => handleFieldChange('source_url', e.target.value)}
              onBlur={() => handleBlur('source_url')}
              placeholder={t('FIELDS.SOURCE_URL.PLACEHOLDER')}
              className={`w-full px-3 py-2 pr-10 border rounded-md text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.source_url
                  ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            />
            <ExternalLink className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          {errors.source_url && (
            <p className="text-sm text-red-600">{errors.source_url}</p>
          )}
          <p className="text-xs text-gray-500">{t('FIELDS.SOURCE_URL.HELP')}</p>

          {/* Preview Button */}
          {data.source_url && !errors.source_url && URL_PATTERN.test(data.source_url) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(data.source_url, '_blank', 'noopener,noreferrer')}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('FIELDS.SOURCE_URL.PREVIEW_BUTTON')}
            </Button>
          )}
        </div>

        {/* Tips Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            {t('STEPS.MEDIA_LINKS.TIPS_TITLE')}
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• {t('STEPS.MEDIA_LINKS.TIP_1')}</li>
            <li>• {t('STEPS.MEDIA_LINKS.TIP_2')}</li>
            <li>• {t('STEPS.MEDIA_LINKS.TIP_3')}</li>
          </ul>
        </div>
      </div>
    </StepContainer>
  );
}