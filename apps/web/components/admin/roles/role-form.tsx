'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Switch } from '@heroui/react';
import { Save, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { RoleData, CreateRoleRequest, UpdateRoleRequest } from '@/hooks/use-admin-roles';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';

interface RoleFormProps {
  role?: RoleData;
  onSubmit: (data: CreateRoleRequest | UpdateRoleRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

const containerClasses = clsx(
  'bg-white dark:bg-gray-900 rounded-xl shadow-xl',
  'border border-gray-200 dark:border-gray-700'
);

const headerClasses = clsx(
  'px-6 py-4 border-b border-gray-200 dark:border-gray-700',
  'bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900'
);

const formClasses = 'p-6 space-y-6';

const actionsClasses = clsx(
  'flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700',
  'bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900',
  '-mx-6 -mb-6 px-6 pb-6'
);

export function RoleForm({ role, onSubmit, onCancel, isLoading = false, mode }: RoleFormProps) {
  const t = useTranslations('admin.ROLE_FORM');
  
  interface RoleFormState {
    name: string;
    description: string;
    status: 'active' | 'inactive';
    isAdmin: boolean;
  }

  const [formData, setFormData] = useState<RoleFormState>({
    name: '',
    description: '',
    status: 'active',
    isAdmin: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RoleFormState, string>>>({});

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description,
        status: role.status,
        isAdmin: role.isAdmin,
      });
    }
  }, [role]);

  const handleInputChange = <K extends keyof RoleFormState>(field: K, value: RoleFormState[K]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('ERRORS.NAME_REQUIRED');
    } else if (formData.name.length < 3) {
      newErrors.name = t('ERRORS.NAME_MIN_LENGTH');
    } else if (formData.name.length > 100) {
      newErrors.name = t('ERRORS.NAME_MAX_LENGTH');
    }

    if (!formData.description.trim()) {
      newErrors.description = t('ERRORS.DESCRIPTION_REQUIRED');
    } else if (formData.description.length > 500) {
      newErrors.description = t('ERRORS.DESCRIPTION_MAX_LENGTH');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className={containerClasses}>
      <div className={headerClasses}>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {mode === 'create' ? t('TITLE_CREATE') : t('TITLE_EDIT')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {mode === 'create'
            ? t('SUBTITLE_CREATE')
            : t('SUBTITLE_EDIT')
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className={formClasses}>
        {/* Role Name */}
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('ROLE_NAME')} *
          </label>
          <Input
            id="name"
            placeholder={t('ROLE_NAME_PLACEHOLDER')}
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            isInvalid={!!errors.name}
            errorMessage={errors.name}
            disabled={isLoading}
          />
        </div>

        {/* Role Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('DESCRIPTION')} *
          </label>
          <Textarea
            id="description"
            placeholder={t('DESCRIPTION_PLACEHOLDER')}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className={clsx(
              'min-h-[100px]',
              errors.description && 'border-red-500 focus:border-red-500'
            )}
            disabled={isLoading}
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description}</p>
          )}
        </div>

        {/* Role Status */}
        <div className="space-y-2">
          <label htmlFor="roleStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('STATUS')}
          </label>
          <div className="flex items-center space-x-3">
            <Switch
              id="roleStatus"
              aria-describedby="roleStatusHelp"
              isSelected={formData.status === 'active'}
              onValueChange={(checked) => handleInputChange('status', checked ? 'active' : 'inactive')}
              disabled={isLoading}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {formData.status === 'active' ? t('ACTIVE') : t('INACTIVE')}
            </span>
          </div>
          <p id="roleStatusHelp" className="text-xs text-gray-500 dark:text-gray-400">
            {formData.status === 'active'
              ? t('ACTIVE_DESCRIPTION')
              : t('INACTIVE_DESCRIPTION')
            }
          </p>
        </div>

        {/* Role Type */}
        <div className="space-y-2">
          <label htmlFor="roleType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('ROLE_TYPE')}
          </label>
          <select
            id="roleType"
            value={formData.isAdmin ? 'admin' : 'client'}
            onChange={(e) => handleInputChange('isAdmin', e.target.value === 'admin')}
            disabled={isLoading}
            className={clsx(
              'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg',
              'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
              'focus:outline-hidden focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary',
              'transition-all duration-200'
            )}
          >
            <option value="client">{t('CLIENT_ROLE')}</option>
            <option value="admin">{t('ADMIN_ROLE')}</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('ROLE_TYPE_DESCRIPTION')}
          </p>
        </div>

        {/* Actions */}
        <div className={actionsClasses}>
          <Button
            type="button"
            variant="bordered"
            onPress={onCancel}
            disabled={isLoading}
            startContent={<X size={16} />}
          >
{t('CANCEL')}
          </Button>
          <Button
            type="submit"
            color="primary"
            isLoading={isLoading}
            startContent={!isLoading && <Save size={16} />}
            className={clsx(
              'bg-linear-to-r from-theme-primary to-theme-accent',
              'hover:from-theme-primary/90 hover:to-theme-accent/90',
              'shadow-lg shadow-theme-primary/25 hover:shadow-xl hover:shadow-theme-primary/40',
              'transition-all duration-300 text-white font-medium'
            )}
          >
{isLoading
              ? (mode === 'create' ? t('CREATING') : t('UPDATING'))
              : (mode === 'create' ? t('CREATE_ROLE') : t('UPDATE_ROLE'))
            }
          </Button>
        </div>
      </form>
    </div>
  );
}