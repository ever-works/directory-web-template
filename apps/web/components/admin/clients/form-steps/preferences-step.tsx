import { useTranslations } from 'next-intl';
import type { StepProps } from './types';
import { FormField } from './form-field';
import { STYLE_CLASSES } from './constants';

export function PreferencesStep({ formData, onInputChange }: StepProps) {
  const t = useTranslations('admin.CLIENT_FORM');

  return (
    <div className={STYLE_CLASSES.stepContainer}>
      {/* Account Type Field */}
      <FormField
        id="accountType"
        type="select"
        label={t('ACCOUNT_TYPE')}
        value={formData.accountType}
        onChange={(value) => onInputChange('accountType', value)}
        options={[
          { value: 'individual', label: t('ACCOUNT_TYPE_OPTIONS.INDIVIDUAL') },
          { value: 'business', label: t('ACCOUNT_TYPE_OPTIONS.BUSINESS') },
          { value: 'enterprise', label: t('ACCOUNT_TYPE_OPTIONS.ENTERPRISE') },
        ]}
      />

      {/* Timezone Field */}
      <FormField
        id="timezone"
        type="select"
        label={t('TIMEZONE')}
        value={formData.timezone}
        onChange={(value) => onInputChange('timezone', value)}
        options={[
          { value: 'UTC', label: t('TIMEZONE_OPTIONS.UTC') },
          { value: 'America/New_York', label: t('TIMEZONE_OPTIONS.AMERICA_NEW_YORK') },
          { value: 'Europe/London', label: t('TIMEZONE_OPTIONS.EUROPE_LONDON') },
          { value: 'Asia/Tokyo', label: t('TIMEZONE_OPTIONS.ASIA_TOKYO') },
        ]}
      />

      {/* Language Field */}
      <FormField
        id="language"
        type="select"
        label={t('LANGUAGE')}
        value={formData.language}
        onChange={(value) => onInputChange('language', value)}
        options={[
          { value: 'en', label: t('LANGUAGE_OPTIONS.EN') },
          { value: 'es', label: t('LANGUAGE_OPTIONS.ES') },
          { value: 'fr', label: t('LANGUAGE_OPTIONS.FR') },
          { value: 'de', label: t('LANGUAGE_OPTIONS.DE') },
        ]}
      />
    </div>
  );
}
