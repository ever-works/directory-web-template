import { useTranslations } from 'next-intl';
import { CLIENT_VALIDATION } from '@/lib/types/client';
import type { StepProps } from './types';
import { FormField } from './form-field';
import { STYLE_CLASSES } from './constants';

export function BasicInfoStep({ formData, errors, onInputChange, mode }: StepProps) {
  const t = useTranslations('admin.CLIENT_FORM');

  return (
    <div className={STYLE_CLASSES.stepContainer}>
      {/* Email Field (only for create mode) */}
      {mode === 'create' && (
        <FormField
          id="email"
          type="email"
          label={t('EMAIL')}
          value={formData.email}
          onChange={(value) => onInputChange('email', value)}
          error={errors.email}
          helpText={t('EMAIL_HELP')}
          placeholder={t('EMAIL_PLACEHOLDER')}
          required
        />
      )}

      {/* Display Name Field */}
      <FormField
        id="displayName"
        type="text"
        label={t('DISPLAY_NAME')}
        value={formData.displayName}
        onChange={(value) => onInputChange('displayName', value)}
        error={errors.displayName}
        placeholder={t('DISPLAY_NAME_PLACEHOLDER')}
        maxLength={CLIENT_VALIDATION.DISPLAY_NAME_MAX_LENGTH}
        showCharCount
      />

      {/* Username Field */}
      <FormField
        id="username"
        type="text"
        label={t('USERNAME')}
        value={formData.username}
        onChange={(value) => onInputChange('username', value)}
        error={errors.username}
        placeholder={t('USERNAME_PLACEHOLDER')}
        maxLength={CLIENT_VALIDATION.USERNAME_MAX_LENGTH}
        showCharCount
      />
    </div>
  );
}
