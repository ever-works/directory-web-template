"use client";

import { useState } from "react";
import { Button, Input } from "@heroui/react";
import { Save, X, FolderOpen } from "lucide-react";
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

  const containerClasses = "bg-white dark:bg-white/[0.03] rounded-xl shadow-xl border border-gray-200 dark:border-white/[0.06]";
  const headerClasses = "px-6 py-4 border-b border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02]";
  const formClasses = "p-6 space-y-5";
  const actionsClasses = "flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] -mx-6 -mb-6 px-6 pb-6 mt-6";

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
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/[0.06]">
            <FolderOpen className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {mode === 'create' ? t('CREATE_TITLE') : t('EDIT_TITLE')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {mode === 'create' ? t('CREATE_DESCRIPTION') : t('EDIT_DESCRIPTION')}
            </p>
          </div>
        </div>
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
            isDisabled={mode === 'edit'}
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
          <div className="flex justify-end mt-1">
            <span className={`text-xs tabular-nums ${formData.name.length > CATEGORY_VALIDATION.NAME_MAX_LENGTH * 0.9 ? 'text-orange-500 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500'}`}>
              {formData.name.length}/{CATEGORY_VALIDATION.NAME_MAX_LENGTH}
            </span>
          </div>
        </div>

        {/* Form Actions */}
        <div className={actionsClasses}>
          <Button
            type="button"
            variant="flat"
            onPress={onCancel}
            isDisabled={isLoading}
            startContent={<X size={15} />}
            className="px-5 py-2 text-sm font-medium"
          >
            {t('CANCEL_BUTTON')}
          </Button>
          <Button
            type="submit"
            color="primary"
            isLoading={isLoading}
            startContent={!isLoading && <Save size={15} />}
            className="px-5 py-2 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm"
          >
            {mode === 'create' ? t('CREATE_BUTTON') : t('UPDATE_BUTTON')}
          </Button>
        </div>
      </form>
    </div>
  );
} 