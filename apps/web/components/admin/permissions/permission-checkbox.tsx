'use client';

import { useState } from 'react';
import { Checkbox } from '@heroui/react';
import clsx from 'clsx';
import { Permission } from '@/lib/permissions/definitions';
import { formatPermissionName, formatPermissionDescription } from '@/lib/permissions/groups';

interface PermissionCheckboxProps {
  permission: Permission;
  isSelected: boolean;
  onChange: (permission: Permission, isSelected: boolean) => void;
  disabled?: boolean;
  showDescription?: boolean;
}

const checkboxContainerClasses = clsx(
  'group flex items-start space-x-3 p-3 rounded-lg',
  'hover:bg-gray-50 dark:hover:bg-gray-800/50',
  'transition-colors duration-200'
);

const checkboxLabelClasses = clsx(
  'flex-1 min-w-0'
);

const permissionNameClasses = clsx(
  'text-sm font-medium text-gray-900 dark:text-white',
  'group-hover:text-gray-700 dark:group-hover:text-gray-200'
);

const permissionDescriptionClasses = clsx(
  'text-xs text-gray-500 dark:text-gray-400 mt-1',
  'group-hover:text-gray-600 dark:group-hover:text-gray-300'
);

const disabledContainerClasses = clsx(
  'opacity-50 cursor-not-allowed'
);

export function PermissionCheckbox({
  permission,
  isSelected,
  onChange,
  disabled = false,
  showDescription = true
}: PermissionCheckboxProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleChange = (checked: boolean) => {
    if (!disabled) {
      onChange(permission, checked);
    }
  };

  const permissionName = formatPermissionName(permission);
  const permissionDescription = formatPermissionDescription(permission);
  const checkboxId = `permission-${permission.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  return (
    <div
      className={clsx(
        checkboxContainerClasses,
        disabled && disabledContainerClasses
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Checkbox
        id={checkboxId}
        isSelected={isSelected}
        onValueChange={handleChange}
        isDisabled={disabled}
        color="primary"
        size="sm"
        aria-describedby={showDescription ? `${checkboxId}-description` : undefined}
      />

      <label
        htmlFor={checkboxId}
        className={checkboxLabelClasses}
      >
        <div className={permissionNameClasses}>
          {permissionName}
        </div>

        {showDescription && (
          <div
            id={`${checkboxId}-description`}
            className={permissionDescriptionClasses}
          >
            {permissionDescription}
          </div>
        )}

        {/* Accessibility: Show permission key on hover for developers */}
        {isHovered && process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-blue-500 dark:text-blue-400 mt-1 font-mono">
            {permission}
          </div>
        )}
      </label>
    </div>
  );
}