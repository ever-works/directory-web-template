"use client";

import { useState, useEffect } from "react";
import { Save, X, Tag, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TagData, TAG_VALIDATION } from "@/lib/types/tag";
import { useTranslations } from 'next-intl';

interface TagFormProps {
  tag?: TagData;
  mode: 'create' | 'edit';
  onSubmit: (data: { id: string; name: string; isActive: boolean }) => void;
  onCancel: () => void;
  isLoading?: boolean;
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

export function TagForm({ tag, mode, onSubmit, onCancel, isLoading = false }: TagFormProps) {
  const t = useTranslations('admin.TAG_FORM');

  const [formData, setFormData] = useState({
    id: tag?.id || '',
    name: tag?.name || '',
    isActive: tag?.isActive ?? true,
  });
  const [errors, setErrors] = useState<{ id?: string; name?: string }>({});

  useEffect(() => {
    if (tag) {
      setFormData({ id: tag.id, name: tag.name, isActive: tag.isActive });
    }
  }, [tag]);

  const validateForm = (): boolean => {
    const newErrors: { id?: string; name?: string } = {};

    if (!formData.id.trim()) {
      newErrors.id = t('ERRORS.ID_REQUIRED');
    } else if (formData.id.length < TAG_VALIDATION.NAME_MIN_LENGTH || formData.id.length > TAG_VALIDATION.NAME_MAX_LENGTH) {
      newErrors.id = t('ERRORS.ID_LENGTH', { min: TAG_VALIDATION.NAME_MIN_LENGTH, max: TAG_VALIDATION.NAME_MAX_LENGTH });
    } else if (!/^[a-z0-9-]+$/.test(formData.id)) {
      newErrors.id = t('ERRORS.ID_FORMAT');
    }

    if (!formData.name.trim()) {
      newErrors.name = t('ERRORS.NAME_REQUIRED');
    } else if (formData.name.length < TAG_VALIDATION.NAME_MIN_LENGTH || formData.name.length > TAG_VALIDATION.NAME_MAX_LENGTH) {
      newErrors.name = t('ERRORS.NAME_LENGTH', { min: TAG_VALIDATION.NAME_MIN_LENGTH, max: TAG_VALIDATION.NAME_MAX_LENGTH });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({ id: formData.id.trim(), name: formData.name.trim(), isActive: formData.isActive });
    }
  };

  const handleInputChange = (field: 'id' | 'name', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/8 rounded-2xl overflow-hidden shadow-2xl shadow-black/20">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/1.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/8 flex items-center justify-center shrink-0">
            <Tag className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {mode === 'create' ? t('TITLE_CREATE') : t('TITLE_EDIT')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {mode === 'create' ? t('SUBTITLE_CREATE') : t('SUBTITLE_EDIT')}
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
        <div className="space-y-1.5">
          <label htmlFor="tag-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('TAG_ID')} <span className="text-red-500">*</span>
          </label>
          <input
            id="tag-id"
            type="text"
            placeholder={t('TAG_ID_PLACEHOLDER')}
            value={formData.id}
            onChange={(e) => handleInputChange('id', e.target.value)}
            disabled={mode === 'edit' || isLoading}
            className={errors.id ? INPUT_ERROR : INPUT_BASE}
          />
          {errors.id && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <span className="inline-block w-1 h-1 rounded-full bg-red-500 shrink-0" />
              {errors.id}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {mode === 'edit' ? t('ID_CANNOT_BE_CHANGED') : t('ID_FORMAT_HINT')}
          </p>
        </div>

        {/* Name Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="tag-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('TAG_NAME')} <span className="text-red-500">*</span>
            </label>
            <span className={cn(
              "text-xs tabular-nums",
              formData.name.length > TAG_VALIDATION.NAME_MAX_LENGTH * 0.9
                ? 'text-orange-500 dark:text-orange-400'
                : 'text-gray-400 dark:text-gray-500'
            )}>
              {formData.name.length}/{TAG_VALIDATION.NAME_MAX_LENGTH}
            </span>
          </div>
          <input
            id="tag-name"
            type="text"
            placeholder={t('TAG_NAME_PLACEHOLDER')}
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            disabled={isLoading}
            className={errors.name ? INPUT_ERROR : INPUT_BASE}
          />
          {errors.name && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <span className="inline-block w-1 h-1 rounded-full bg-red-500 shrink-0" />
              {errors.name}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('NAME_DISPLAY_HINT')}</p>
        </div>

        {/* Active / Inactive Toggle */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('STATUS')}</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
              role="switch"
              aria-checked={formData.isActive}
              disabled={isLoading}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:ring-offset-2 dark:focus:ring-offset-gray-900",
                "disabled:opacity-50",
                formData.isActive ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-white/[0.12]'
              )}
            >
              <span className={cn(
                "inline-block h-3.5 w-3.5 transform rounded-full transition-transform",
                formData.isActive
                  ? 'translate-x-[18px] bg-white dark:bg-gray-900'
                  : 'translate-x-[3px] bg-white dark:bg-gray-400'
              )} />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {formData.isActive ? t('ACTIVE') : t('INACTIVE')}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formData.isActive ? t('ACTIVE_DESCRIPTION') : t('INACTIVE_DESCRIPTION')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/8 -mx-5 -mb-5 px-5 pb-5 mt-5 bg-gray-50/60 dark:bg-white/1.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
          >
            <X className="w-3.5 h-3.5" />
            {t('CANCEL')}
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
            {mode === 'create' ? t('CREATE_TAG') : t('UPDATE_TAG')}
          </button>
        </div>
      </form>
    </div>
  );
}
