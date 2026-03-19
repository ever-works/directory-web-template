import { useTranslations } from 'next-intl';
import { CLIENT_VALIDATION } from '@/lib/types/client';
import type { StepProps } from './types';
import { FormField } from './form-field';
import { STYLE_CLASSES } from './constants';

export function ProfileStep({ formData, errors, onInputChange }: StepProps) {
  const t = useTranslations('admin.CLIENT_FORM');

  return (
    <div className={STYLE_CLASSES.stepContainer}>
      {/* Bio Field */}
      <FormField
        id="bio"
        type="textarea"
        label={t('BIO')}
        value={formData.bio}
        onChange={(value) => onInputChange('bio', value)}
        error={errors.bio}
        placeholder={t('BIO_PLACEHOLDER')}
        maxLength={CLIENT_VALIDATION.BIO_MAX_LENGTH}
        rows={4}
        showCharCount
      />

      {/* Job Title Field */}
      <FormField
        id="jobTitle"
        type="text"
        label={t('JOB_TITLE')}
        value={formData.jobTitle}
        onChange={(value) => onInputChange('jobTitle', value)}
        error={errors.jobTitle}
        placeholder={t('JOB_TITLE_PLACEHOLDER')}
        maxLength={CLIENT_VALIDATION.JOB_TITLE_MAX_LENGTH}
      />

      {/* Company Field */}
      <FormField
        id="company"
        type="text"
        label={t('COMPANY')}
        value={formData.company}
        onChange={(value) => onInputChange('company', value)}
        error={errors.company}
        placeholder={t('COMPANY_PLACEHOLDER')}
        maxLength={CLIENT_VALIDATION.COMPANY_MAX_LENGTH}
        showCharCount
      />

      {/* Industry Field */}
      <FormField
        id="industry"
        type="text"
        label={t('INDUSTRY')}
        value={formData.industry}
        onChange={(value) => onInputChange('industry', value)}
        error={errors.industry}
        placeholder={t('INDUSTRY_PLACEHOLDER')}
        maxLength={CLIENT_VALIDATION.INDUSTRY_MAX_LENGTH}
        showCharCount
      />
    </div>
  );
}
