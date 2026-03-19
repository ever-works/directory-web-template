"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TagData, TAG_VALIDATION } from "@/lib/types/tag";
import { useTranslations } from 'next-intl';

interface TagFormProps {
  tag?: TagData;
  mode: 'create' | 'edit';
  onSubmit: (data: { id: string; name: string; isActive: boolean }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TagForm({ tag, mode, onSubmit, onCancel, isLoading = false }: TagFormProps) {
  const t = useTranslations('admin.TAG_FORM');
  
  // Extract long className strings into constants for better maintainability
  const baseInputClasses = "w-full px-3 py-2 border rounded-md text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const errorInputClasses = "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700";
  const normalInputClasses = "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white";
  const disabledInputClasses = "bg-gray-100 dark:bg-gray-600 cursor-not-allowed";

  const [formData, setFormData] = useState({
    id: tag?.id || '',
    name: tag?.name || '',
    isActive: tag?.isActive ?? true,
  });

  const [errors, setErrors] = useState<{ id?: string; name?: string }>({});

  useEffect(() => {
    if (tag) {
      setFormData({
        id: tag.id,
        name: tag.name,
        isActive: tag.isActive,
      });
    }
  }, [tag]);

  const validateForm = (): boolean => {
    const newErrors: { id?: string; name?: string } = {};

    // Validate ID
    if (!formData.id.trim()) {
      newErrors.id = t('ERRORS.ID_REQUIRED');
    } else if (formData.id.length < TAG_VALIDATION.NAME_MIN_LENGTH || formData.id.length > TAG_VALIDATION.NAME_MAX_LENGTH) {
      newErrors.id = t('ERRORS.ID_LENGTH', { 
        min: TAG_VALIDATION.NAME_MIN_LENGTH, 
        max: TAG_VALIDATION.NAME_MAX_LENGTH 
      });
    } else if (!/^[a-z0-9-]+$/.test(formData.id)) {
      newErrors.id = t('ERRORS.ID_FORMAT');
    }

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = t('ERRORS.NAME_REQUIRED');
    } else if (formData.name.length < TAG_VALIDATION.NAME_MIN_LENGTH || formData.name.length > TAG_VALIDATION.NAME_MAX_LENGTH) {
      newErrors.name = t('ERRORS.NAME_LENGTH', { 
        min: TAG_VALIDATION.NAME_MIN_LENGTH, 
        max: TAG_VALIDATION.NAME_MAX_LENGTH 
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({
        id: formData.id.trim(),
        name: formData.name.trim(),
        isActive: formData.isActive,
      });
    }
  };

  const handleInputChange = (field: 'id' | 'name', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleToggleActive = () => {
    setFormData(prev => ({ ...prev, isActive: !prev.isActive }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="bg-linear-to-r from-blue-500 to-purple-600 px-6 py-4 rounded-t-lg">
        <h2 className="text-xl font-bold text-white">
          {mode === 'create' ? t('TITLE_CREATE') : t('TITLE_EDIT')}
        </h2>
        <p className="text-blue-100 text-sm mt-1">
          {mode === 'create' ? t('SUBTITLE_CREATE') : t('SUBTITLE_EDIT')}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* ID Field */}
        <div className="space-y-2">
          <label htmlFor="tag-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('TAG_ID')} <span className="text-red-500">*</span>
          </label>
          <input
            id="tag-id"
            type="text"
            placeholder={t('TAG_ID_PLACEHOLDER')}
            value={formData.id}
            onChange={(e) => handleInputChange('id', e.target.value)}
            disabled={mode === 'edit'}
            className={`${baseInputClasses} ${
              errors.id ? errorInputClasses : normalInputClasses
            } ${
              mode === 'edit' ? disabledInputClasses : ''
            }`}
          />
          {errors.id && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.id}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {mode === 'edit' ? t('ID_CANNOT_BE_CHANGED') : t('ID_FORMAT_HINT')}
          </p>
        </div>

        {/* Name Field */}
        <div className="space-y-2">
          <label htmlFor="tag-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('TAG_NAME')} <span className="text-red-500">*</span>
          </label>
          <input
            id="tag-name"
            type="text"
            placeholder={t('TAG_NAME_PLACEHOLDER')}
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.name 
                ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700' 
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
            }`}
          />
          {errors.name && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.name}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('NAME_DISPLAY_HINT')}
          </p>
        </div>

        {/* Active/Inactive Toggle */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('STATUS')}
          </label>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleToggleActive}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                formData.isActive 
                  ? 'bg-blue-600 dark:bg-blue-500' 
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {formData.isActive ? t('ACTIVE') : t('INACTIVE')}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formData.isActive 
              ? t('ACTIVE_DESCRIPTION')
              : t('INACTIVE_DESCRIPTION')
            }
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onPress={onCancel}
            isDisabled={isLoading}
            className="px-6"
          >
{t('CANCEL')}
          </Button>
          <Button
            type="submit"
            color="primary"
            isLoading={isLoading}
            className="px-6 bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
{mode === 'create' ? t('CREATE_TAG') : t('UPDATE_TAG')}
          </Button>
        </div>
      </form>
    </div>
  );
} 