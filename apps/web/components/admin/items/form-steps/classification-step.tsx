"use client";

import { useState, useEffect, useCallback } from 'react';
import { StepContainer } from '@/components/ui/multi-step-form';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Hash, Folder } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface ClassificationData {
  category: string[];
  tags: string[];
}

interface ClassificationStepProps {
  data: ClassificationData;
  onChange: (data: ClassificationData) => void;
  onValidationChange: (isValid: boolean) => void;
}

const SUGGESTED_CATEGORIES = [
  'Web Development',
  'Mobile Apps',
  'Design Tools',
  'Productivity',
  'Developer Tools',
  'Marketing',
  'Analytics',
  'Education',
  'Entertainment',
  'Business'
];

const SUGGESTED_TAGS = [
  'javascript', 'react', 'vue', 'angular', 'nodejs',
  'python', 'ai', 'machine-learning', 'mobile', 'ios',
  'android', 'design', 'ui-ux', 'figma', 'sketch',
  'productivity', 'automation', 'api', 'database', 'cloud'
];

export function ClassificationStep({
  data,
  onChange,
  onValidationChange
}: ClassificationStepProps) {
  const t = useTranslations('admin.ITEM_FORM');
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const validateData = useCallback((): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (data.category.length === 0) {
      newErrors.category = t('ERRORS.CATEGORY_REQUIRED');
    }

    if (data.tags.length === 0) {
      newErrors.tags = t('ERRORS.TAGS_REQUIRED');
    }

    return newErrors;
  }, [data, t]);

  const handleBlur = (field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
  };

  // Add category
  const addCategory = (categoryToAdd: string) => {
    const trimmedCategory = categoryToAdd.trim();
    if (trimmedCategory && !data.category.includes(trimmedCategory)) {
      const newData = {
        ...data,
        category: [...data.category, trimmedCategory]
      };
      onChange(newData);
      setNewCategory('');
      setTouchedFields(prev => new Set(prev).add('category'));
    }
  };

  // Remove category
  const removeCategory = (categoryToRemove: string) => {
    const newData = {
      ...data,
      category: data.category.filter(cat => cat !== categoryToRemove)
    };
    onChange(newData);
    setTouchedFields(prev => new Set(prev).add('category'));
  };

  // Add tag
  const addTag = (tagToAdd: string) => {
    const trimmedTag = tagToAdd.trim().toLowerCase();
    if (trimmedTag && !data.tags.includes(trimmedTag)) {
      const newData = {
        ...data,
        tags: [...data.tags, trimmedTag]
      };
      onChange(newData);
      setNewTag('');
      setTouchedFields(prev => new Set(prev).add('tags'));
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    const newData = {
      ...data,
      tags: data.tags.filter(tag => tag !== tagToRemove)
    };
    onChange(newData);
    setTouchedFields(prev => new Set(prev).add('tags'));
  };

  // Handle Enter key
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: 'category' | 'tag',
    value: string
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'category') {
        addCategory(value);
      } else {
        addTag(value);
      }
    }
  };

  // Validate on data change
  useEffect(() => {
    const allErrors = validateData();

    // Only show errors for touched fields
    const visibleErrors: Record<string, string> = {};
    Object.keys(allErrors).forEach(field => {
      if (touchedFields.has(field)) {
        visibleErrors[field] = allErrors[field];
      }
    });

    setErrors(visibleErrors);
    onValidationChange(Object.keys(allErrors).length === 0);
  }, [data, touchedFields, onValidationChange, validateData]);

  return (
    <StepContainer
      title={t('STEPS.CLASSIFICATION.TITLE')}
      description={t('STEPS.CLASSIFICATION.DESCRIPTION')}
    >
      <div className="space-y-8">
        {/* Categories Section */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">
              <Folder className="w-4 h-4 inline mr-2" />
              {t('FIELDS.CATEGORY.LABEL')} <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-gray-500 mt-1">{t('FIELDS.CATEGORY.HELP')}</p>
          </div>

          {/* Category Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'category', newCategory)}
              onBlur={() => handleBlur('category')}
              placeholder={t('FIELDS.CATEGORY.PLACEHOLDER')}
              className={`flex-1 px-3 py-2 border rounded-md text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.category
                  ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            />
            <Button
              type="button"
              onClick={() => addCategory(newCategory)}
              disabled={!newCategory.trim()}
              size="sm"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Current Categories */}
          {data.category.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.category.map((category) => (
                <Badge
                  key={category}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {category}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() => removeCategory(category)}
                  />
                </Badge>
              ))}
            </div>
          )}

          {/* Suggested Categories */}
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{t('FIELDS.CATEGORY.SUGGESTED')}:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_CATEGORIES
                .filter(cat => !data.category.includes(cat))
                .map((category) => (
                <Button
                  key={category}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addCategory(category)}
                  className="text-xs h-7"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {errors.category && (
            <p className="text-sm text-red-600">{errors.category}</p>
          )}
        </div>

        {/* Tags Section */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">
              <Hash className="w-4 h-4 inline mr-2" />
              {t('FIELDS.TAGS.LABEL')} <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-gray-500 mt-1">{t('FIELDS.TAGS.HELP')}</p>
          </div>

          {/* Tag Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'tag', newTag)}
              onBlur={() => handleBlur('tags')}
              placeholder={t('FIELDS.TAGS.PLACEHOLDER')}
              className={`flex-1 px-3 py-2 border rounded-md text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.tags
                  ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            />
            <Button
              type="button"
              onClick={() => addTag(newTag)}
              disabled={!newTag.trim()}
              size="sm"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Current Tags */}
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  #{tag}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          )}

          {/* Suggested Tags */}
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{t('FIELDS.TAGS.SUGGESTED')}:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS
                .filter(tag => !data.tags.includes(tag))
                .slice(0, 15) // Limit to prevent UI overflow
                .map((tag) => (
                <Button
                  key={tag}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTag(tag)}
                  className="text-xs h-7"
                >
                  #{tag}
                </Button>
              ))}
            </div>
          </div>

          {errors.tags && (
            <p className="text-sm text-red-600">{errors.tags}</p>
          )}
        </div>

        {/* Tips Section */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
            {t('STEPS.CLASSIFICATION.TIPS_TITLE')}
          </h4>
          <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
            <li>• {t('STEPS.CLASSIFICATION.TIP_1')}</li>
            <li>• {t('STEPS.CLASSIFICATION.TIP_2')}</li>
            <li>• {t('STEPS.CLASSIFICATION.TIP_3')}</li>
          </ul>
        </div>
      </div>
    </StepContainer>
  );
}