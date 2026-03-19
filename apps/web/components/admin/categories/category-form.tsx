"use client";

import { useState } from "react";
import { Button, Input } from "@heroui/react";
import { Save, X } from "lucide-react";
import { CategoryData, CreateCategoryRequest, UpdateCategoryRequest, CATEGORY_VALIDATION } from "@/lib/types/category";
import { useTranslations } from "next-intl";

interface CategoryFormProps {
  category?: CategoryData;
  onSubmit: (data: CreateCategoryRequest | UpdateCategoryRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export function CategoryForm({ category, onSubmit, onCancel, isLoading = false, mode }: CategoryFormProps) {
  const t = useTranslations("admin.CATEGORY_FORM");
  
  // Extract long className strings into constants for better maintainability
  const containerClasses = "bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700";
  const headerClasses = "px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900";
  const formClasses = "p-6 space-y-6";
  const actionsClasses = "flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700 bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 -mx-6 -mb-6 px-6 pb-6";

  const [formData, setFormData] = useState({
    id: category?.id || '',
    name: category?.name || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // ID validation
    if (!formData.id.trim()) {
      newErrors.id = t('ID_REQUIRED');
    } else if (!/^[a-z0-9-]+$/.test(formData.id.trim())) {
      newErrors.id = t('ID_INVALID_FORMAT');
    } else if (formData.id.trim().length < 3) {
      newErrors.id = t('ID_TOO_SHORT');
    } else if (formData.id.trim().length > 50) {
      newErrors.id = t('ID_TOO_LONG');
    }

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = t('NAME_REQUIRED');
    } else if (formData.name.trim().length < CATEGORY_VALIDATION.NAME_MIN_LENGTH) {
      newErrors.name = t('NAME_TOO_SHORT', { min: CATEGORY_VALIDATION.NAME_MIN_LENGTH });
    } else if (formData.name.trim().length > CATEGORY_VALIDATION.NAME_MAX_LENGTH) {
      newErrors.name = t('NAME_TOO_LONG', { max: CATEGORY_VALIDATION.NAME_MAX_LENGTH });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const submitData = mode === 'edit' 
        ? { ...formData } as UpdateCategoryRequest
        : formData as CreateCategoryRequest;

      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className={containerClasses}>
      <div className={headerClasses}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {mode === 'create' ? t('CREATE_TITLE') : t('EDIT_TITLE')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {mode === 'create' ? t('CREATE_DESCRIPTION') : t('EDIT_DESCRIPTION')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={formClasses}>
        {/* ID Field */}
        <div>
          <Input
            label={t('CATEGORY_ID_LABEL')}
            placeholder={t('CATEGORY_ID_PLACEHOLDER')}
            value={formData.id}
            onChange={(e) => handleInputChange('id', e.target.value)}
            errorMessage={errors.id}
            isInvalid={!!errors.id}
            isRequired
            isDisabled={mode === 'edit'} // ID cannot be changed when editing
            className="w-full"
            description={mode === 'edit' ? t('CATEGORY_ID_EDIT_DESCRIPTION') : t('CATEGORY_ID_DESCRIPTION')}
          />
        </div>

        {/* Name Field */}
        <div>
          <Input
            label={t('CATEGORY_NAME_LABEL')}
            placeholder={t('CATEGORY_NAME_PLACEHOLDER')}
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            errorMessage={errors.name}
            isInvalid={!!errors.name}
            isRequired
            maxLength={CATEGORY_VALIDATION.NAME_MAX_LENGTH}
            className="w-full"
            description={t('CATEGORY_NAME_DESCRIPTION')}
          />
          <div className="text-xs text-gray-500 mt-1">
            {formData.name.length}/{CATEGORY_VALIDATION.NAME_MAX_LENGTH} {t('CHARACTERS_COUNT')}
          </div>
        </div>

        {/* Form Actions */}
        <div className={actionsClasses}>
          <Button
            type="button"
            variant="flat"
            onPress={onCancel}
            isDisabled={isLoading}
            startContent={<X size={16} />}
            className="px-6 py-2 font-medium"
          >
            {t('CANCEL_BUTTON')}
          </Button>
          <Button
            type="submit"
            color="primary"
            isLoading={isLoading}
            startContent={!isLoading && <Save size={16} />}
            className="px-6 py-2 font-medium bg-linear-to-r from-theme-primary to-theme-accent hover:from-theme-primary/90 hover:to-theme-accent/90 shadow-lg"
          >
            {mode === 'create' ? t('CREATE_BUTTON') : t('UPDATE_BUTTON')}
          </Button>
        </div>
      </form>
    </div>
  );
} 