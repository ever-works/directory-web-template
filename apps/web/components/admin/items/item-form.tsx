"use client";

import { useState, useEffect } from "react";
import { ItemData, CreateItemRequest, UpdateItemRequest, ITEM_VALIDATION, ITEM_STATUSES } from "@/lib/types/item";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import { useTranslations } from 'next-intl';

interface ItemFormProps {
  item?: ItemData;
  mode: 'create' | 'edit';
  onSubmit: (data: CreateItemRequest | UpdateItemRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ItemForm({ item, mode, onSubmit, onCancel, isLoading = false }: ItemFormProps) {
  const t = useTranslations('admin.ITEM_FORM');
  
  const [formData, setFormData] = useState({
    id: item?.id || '',
    name: item?.name || '',
    slug: item?.slug || '',
    description: item?.description || '',
    source_url: item?.source_url || '',
    category: item?.category || [],
    tags: item?.tags || [],
    featured: item?.featured || false,
    icon_url: item?.icon_url || '',
    status: item?.status || ITEM_STATUSES.DRAFT,
  });

  const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({});

  useEffect(() => {
    if (item) {
      setFormData({
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description,
        source_url: item.source_url,
        category: item.category,
        tags: item.tags,
        featured: item.featured || false,
        icon_url: item.icon_url || '',
        status: item.status,
      });
    }
  }, [item]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Validate ID
    if (!formData.id.trim()) {
      newErrors.id = t('ERRORS.ID_REQUIRED');
    } else if (formData.id.length < ITEM_VALIDATION.NAME_MIN_LENGTH || formData.id.length > ITEM_VALIDATION.NAME_MAX_LENGTH) {
      newErrors.id = t('ERRORS.ID_LENGTH', { 
        min: ITEM_VALIDATION.NAME_MIN_LENGTH, 
        max: ITEM_VALIDATION.NAME_MAX_LENGTH 
      });
    } else if (!/^[a-z0-9-]+$/.test(formData.id)) {
      newErrors.id = t('ERRORS.ID_FORMAT');
    }

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = t('ERRORS.NAME_REQUIRED');
    } else if (formData.name.length < ITEM_VALIDATION.NAME_MIN_LENGTH || formData.name.length > ITEM_VALIDATION.NAME_MAX_LENGTH) {
      newErrors.name = t('ERRORS.NAME_LENGTH', { 
        min: ITEM_VALIDATION.NAME_MIN_LENGTH, 
        max: ITEM_VALIDATION.NAME_MAX_LENGTH 
      });
    }

    // Validate slug
    if (!formData.slug.trim()) {
      newErrors.slug = t('ERRORS.SLUG_REQUIRED');
    } else if (formData.slug.length < ITEM_VALIDATION.SLUG_MIN_LENGTH || formData.slug.length > ITEM_VALIDATION.SLUG_MAX_LENGTH) {
      newErrors.slug = t('ERRORS.SLUG_LENGTH', { 
        min: ITEM_VALIDATION.SLUG_MIN_LENGTH, 
        max: ITEM_VALIDATION.SLUG_MAX_LENGTH 
      });
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = t('ERRORS.SLUG_FORMAT');
    }

    // Validate description
    if (!formData.description.trim()) {
      newErrors.description = t('ERRORS.DESCRIPTION_REQUIRED');
    } else if (formData.description.length < ITEM_VALIDATION.DESCRIPTION_MIN_LENGTH || formData.description.length > ITEM_VALIDATION.DESCRIPTION_MAX_LENGTH) {
      newErrors.description = t('ERRORS.DESCRIPTION_LENGTH', { 
        min: ITEM_VALIDATION.DESCRIPTION_MIN_LENGTH, 
        max: ITEM_VALIDATION.DESCRIPTION_MAX_LENGTH 
      });
    }

    // Validate source URL
    if (!formData.source_url.trim()) {
      newErrors.source_url = t('ERRORS.SOURCE_URL_REQUIRED');
    } else {
      try {
        new URL(formData.source_url);
      } catch {
        newErrors.source_url = t('ERRORS.SOURCE_URL_INVALID');
      }
    }

    // Validate category
    if (!formData.category || (Array.isArray(formData.category) && formData.category.length === 0)) {
      newErrors.category = t('ERRORS.CATEGORY_REQUIRED');
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
        slug: formData.slug.trim(),
        description: formData.description.trim(),
        source_url: formData.source_url.trim(),
        category: formData.category,
        tags: formData.tags,
        featured: formData.featured,
        icon_url: formData.icon_url.trim(),
        status: formData.status,
      });
    }
  };

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCategoryChange = (value: string) => {
    const categories = value.split(',').map(cat => cat.trim()).filter(cat => cat);
    handleInputChange('category', categories);
  };

  const handleTagsChange = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag);
    handleInputChange('tags', tags);
  };

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    if (slug) {
      handleInputChange('slug', slug);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-r from-theme-primary to-theme-accent px-6 py-4">
        <h2 className="text-xl font-bold text-white">
          {mode === 'create' ? t('TITLE_CREATE') : t('TITLE_EDIT')}
        </h2>
        <p className="text-white/80 text-sm mt-1">
          {mode === 'create' ? t('SUBTITLE_CREATE') : t('SUBTITLE_EDIT')}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* ID Field */}
        <div className="space-y-2">
          <label htmlFor="item-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('ITEM_ID')} <span className="text-red-500">*</span>
          </label>
          <input
            id="item-id"
            type="text"
            placeholder={t('ITEM_ID_PLACEHOLDER')}
            value={formData.id}
            onChange={(e) => handleInputChange('id', e.target.value)}
            disabled={mode === 'edit'}
            className={`w-full px-3 py-2 border rounded-md text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.id 
                ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700' 
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
            } ${mode === 'edit' ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''}`}
          />
          {errors.id && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.id}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('ID_HELP')}
          </p>
        </div>

        {/* Name Field */}
        <div className="space-y-2">
          <label htmlFor="item-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('ITEM_NAME')} <span className="text-red-500">*</span>
          </label>
          <input
            id="item-name"
            type="text"
            placeholder={t('ITEM_NAME_PLACEHOLDER')}
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
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            {t('NAME_HELP')}
          </p>
        </div>

        {/* Slug Field */}
        <div className="space-y-2">
          <label htmlFor="item-slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('ITEM_SLUG')} <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-2">
            <input
              id="item-slug"
              type="text"
              placeholder={t('ITEM_SLUG_PLACEHOLDER')}
              value={formData.slug}
              onChange={(e) => handleInputChange('slug', e.target.value)}
              className={`flex-1 px-3 py-2 border rounded-md text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.slug 
                  ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700' 
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            />
            <Button
              type="button"
              variant="outline"
              onClick={generateSlug}
              className="px-3 py-2 text-sm"
            >
{t('GENERATE')}
            </Button>
          </div>
          {errors.slug && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.slug}</p>
          )}
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            {t('SLUG_HELP')}
          </p>
        </div>

        {/* Description Field */}
        <div className="space-y-2">
          <label htmlFor="item-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('DESCRIPTION')} <span className="text-red-500">*</span>
          </label>
          <textarea
            id="item-description"
            rows={4}
            placeholder={t('DESCRIPTION_PLACEHOLDER')}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
              errors.description 
                ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700' 
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
            }`}
          />
          {errors.description && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.description}</p>
          )}
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            {t('DESCRIPTION_HELP', { current: formData.description.length, max: ITEM_VALIDATION.DESCRIPTION_MAX_LENGTH })}
          </p>
        </div>

        {/* Source URL Field */}
        <div className="space-y-2">
          <label htmlFor="item-source-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('SOURCE_URL')} <span className="text-red-500">*</span>
          </label>
          <input
            id="item-source-url"
            type="url"
            placeholder={t('SOURCE_URL_PLACEHOLDER')}
            value={formData.source_url}
            onChange={(e) => handleInputChange('source_url', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.source_url 
                ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700' 
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
            }`}
          />
          {errors.source_url && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.source_url}</p>
          )}
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            {t('SOURCE_URL_HELP')}
          </p>
        </div>

        {/* Category Field */}
        <div className="space-y-2">
          <label htmlFor="item-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('CATEGORIES')} <span className="text-red-500">*</span>
          </label>
          <input
            id="item-category"
            type="text"
            placeholder={t('CATEGORIES_PLACEHOLDER')}
            value={(formData.category as string[]).join(', ')}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.category 
                ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700' 
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
            }`}
          />
          {errors.category && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.category}</p>
          )}
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            {t('CATEGORIES_HELP')}
          </p>
        </div>

        {/* Tags Field */}
        <div className="space-y-2">
          <label htmlFor="item-tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('TAGS')}
          </label>
          <input
            id="item-tags"
            type="text"
            placeholder={t('TAGS_PLACEHOLDER')}
            value={formData.tags.join(', ')}
            onChange={(e) => handleTagsChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            {t('TAGS_HELP')}
          </p>
        </div>

        {/* Icon URL Field */}
        <div className="space-y-2">
          <label htmlFor="item-icon-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('ICON_URL')}
          </label>
          <input
            id="item-icon-url"
            type="url"
            placeholder={t('ICON_URL_PLACEHOLDER')}
            value={formData.icon_url}
            onChange={(e) => handleInputChange('icon_url', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            {t('ICON_URL_HELP')}
          </p>
        </div>

        {/* Featured Toggle */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('FEATURED_ITEM')}
          </label>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => handleInputChange('featured', !formData.featured)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                formData.featured 
                  ? 'bg-blue-600 dark:bg-blue-500' 
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.featured ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {formData.featured ? t('FEATURED') : t('NOT_FEATURED')}
            </span>
          </div>
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            {t('FEATURED_HELP')}
          </p>
        </div>

        {/* Status Field */}
        <div className="space-y-2">
          <label htmlFor="item-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('STATUS')}
          </label>
          <select
            id="item-status"
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={ITEM_STATUSES.DRAFT}>{t('STATUS_OPTIONS.DRAFT')}</option>
            <option value={ITEM_STATUSES.PENDING}>{t('STATUS_OPTIONS.PENDING')}</option>
            <option value={ITEM_STATUSES.APPROVED}>{t('STATUS_OPTIONS.APPROVED')}</option>
            <option value={ITEM_STATUSES.REJECTED}>{t('STATUS_OPTIONS.REJECTED')}</option>
          </select>
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            {t('STATUS_HELP')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="px-4 py-2"
          >
            <X className="w-4 h-4 mr-2" />
{t('CANCEL')}
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-linear-to-r from-theme-primary to-theme-accent hover:from-theme-primary/90 hover:to-theme-accent/90 text-white"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
{mode === 'create' ? t('CREATE_ITEM') : t('UPDATE_ITEM')}
          </Button>
        </div>
      </form>
    </div>
  );
} 