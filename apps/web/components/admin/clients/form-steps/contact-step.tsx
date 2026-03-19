import { useTranslations } from 'next-intl';
import { CLIENT_VALIDATION } from '@/lib/types/client';
import type { StepProps } from './types';
import { FormField } from './form-field';
import { STYLE_CLASSES } from './constants';

export function ContactStep({ formData, errors, onInputChange }: StepProps) {
  const t = useTranslations('admin.CLIENT_FORM');

  return (
    <div className={STYLE_CLASSES.stepContainer}>
      {/* Contact Information Grid */}
      <div className={STYLE_CLASSES.gridTwoCol}>
        {/* Phone Field */}
        <FormField
          id="phone"
          type="tel"
          label={t('PHONE')}
          value={formData.phone}
          onChange={(value) => onInputChange('phone', value)}
          error={errors.phone}
          placeholder={t('PHONE_PLACEHOLDER')}
          maxLength={CLIENT_VALIDATION.PHONE_MAX_LENGTH}
        />

        {/* Website Field */}
        <FormField
          id="website"
          type="url"
          label={t('WEBSITE')}
          value={formData.website}
          onChange={(value) => onInputChange('website', value)}
          error={errors.website}
          placeholder={t('WEBSITE_PLACEHOLDER')}
          maxLength={CLIENT_VALIDATION.WEBSITE_MAX_LENGTH}
        />
      </div>

      {/* Location Field */}
      <FormField
        id="location"
        type="text"
        label={t('LOCATION')}
        value={formData.location}
        onChange={(value) => onInputChange('location', value)}
        error={errors.location}
        placeholder={t('LOCATION_PLACEHOLDER')}
        maxLength={CLIENT_VALIDATION.LOCATION_MAX_LENGTH}
        showCharCount
      />
    </div>
  );
}
