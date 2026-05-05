"use client";

import { useState } from "react";
import { Save, X, FolderTree, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryData, CreateCategoryRequest, UpdateCategoryRequest, CATEGORY_VALIDATION } from "@/lib/types/category";
import { useTranslations } from "next-intl";

interface CategoryFormProps {
  category?: CategoryData;
  onSubmit: (data: CreateCategoryRequest | UpdateCategoryRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

const INPUT_BASE = cn(
  "w-full h-10 px-3 text-sm rounded-xl",
  "bg-white dark:bg-white/3",
  "border border-gray-200 dark:border-white/8",
  "text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
  "focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/20",
  "transition-all duration-150",
  "disabled:opacity-50 disabled:cursor-not-allowed"
);

const INPUT_ERROR = cn(
  INPUT_BASE,
  "border-red-400 dark:border-red-500/60 focus:ring-red-500/20 focus:border-red-400"
);

function Field({
  label,
  required,
  hint,
  error,
  children,
  counter,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  counter?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        {counter}
      </div>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-red-500 shrink-0" />
          {error}
        </p>
      )}
      {!error && hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

export function CategoryForm({ category, onSubmit, onCancel, isLoading = false, mode }: CategoryFormProps) {
  const t = useTranslations("admin.CATEGORY_FORM");

  const [formData, setFormData] = useState({
    id: category?.id || '',
    name: category?.name || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.id.trim()) {
      newErrors.id = t('ID_REQUIRED');
    } else if (!/^[a-z0-9-]+$/.test(formData.id.trim())) {
      newErrors.id = t('ID_INVALID_FORMAT');
    } else if (formData.id.trim().length < 3) {
      newErrors.id = t('ID_TOO_SHORT');
    } else if (formData.id.trim().length > 50) {
      newErrors.id = t('ID_TOO_LONG');
    }

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
    if (!validateForm()) return;
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
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/8 rounded-2xl overflow-hidden shadow-2xl shadow-black/20">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/1.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/8 flex items-center justify-center shrink-0">
            <FolderTree className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {mode === 'create' ? t('CREATE_TITLE') : t('EDIT_TITLE')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {mode === 'create' ? t('CREATE_DESCRIPTION') : t('EDIT_DESCRIPTION')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          aria-label="Close"
          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-white/8 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* ID Field */}
        <Field
          label={t('CATEGORY_ID_LABEL')}
          required
          hint={mode === 'edit' ? t('CATEGORY_ID_EDIT_DESCRIPTION') : t('CATEGORY_ID_DESCRIPTION')}
          error={errors.id}
        >
          <input
            type="text"
            placeholder={t('CATEGORY_ID_PLACEHOLDER')}
            value={formData.id}
            onChange={(e) => handleInputChange('id', e.target.value)}
            disabled={mode === 'edit' || isLoading}
            className={errors.id ? INPUT_ERROR : INPUT_BASE}
          />
        </Field>

        {/* Name Field */}
        <Field
          label={t('CATEGORY_NAME_LABEL')}
          required
          hint={t('CATEGORY_NAME_DESCRIPTION')}
          error={errors.name}
          counter={
            <span className={cn(
              "text-xs tabular-nums",
              formData.name.length > CATEGORY_VALIDATION.NAME_MAX_LENGTH * 0.9
                ? 'text-orange-500 dark:text-orange-400'
                : 'text-gray-400 dark:text-gray-500'
            )}>
              {formData.name.length}/{CATEGORY_VALIDATION.NAME_MAX_LENGTH}
            </span>
          }
        >
          <input
            type="text"
            placeholder={t('CATEGORY_NAME_PLACEHOLDER')}
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            disabled={isLoading}
            maxLength={CATEGORY_VALIDATION.NAME_MAX_LENGTH}
            className={errors.name ? INPUT_ERROR : INPUT_BASE}
          />
        </Field>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/8 -mx-5 -mb-5 px-5 pb-5 mt-5 bg-gray-50/60 dark:bg-white/1.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
          >
            <X className="w-3.5 h-3.5" />
            {t('CANCEL_BUTTON')}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-950"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {mode === 'create' ? t('CREATE_BUTTON') : t('UPDATE_BUTTON')}
          </button>
        </div>
      </form>
    </div>
  );
}
