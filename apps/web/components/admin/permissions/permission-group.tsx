'use client';

import { useMemo } from 'react';
import { Button, Checkbox } from '@heroui/react';
import { ChevronDown, ChevronRight, FileText, Users, Settings } from 'lucide-react';
import clsx from 'clsx';
import { Permission } from '@/lib/permissions/definitions';
import { PermissionGroup, formatPermissionName } from '@/lib/permissions/groups';
import { PermissionState } from '@/lib/permissions/utils';
import { PermissionCheckbox } from './permission-checkbox';

interface PermissionGroupProps {
  group: PermissionGroup;
  permissionState: PermissionState;
  onPermissionChange: (permission: Permission, isSelected: boolean) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  disabled?: boolean;
  searchTerm?: string;
}

const groupContainerClasses = clsx(
  'border border-gray-200 dark:border-gray-700 rounded-lg',
  'bg-white dark:bg-gray-900 shadow-xs'
);

const groupHeaderClasses = clsx(
  'flex items-center justify-between p-4',
  'border-b border-gray-200 dark:border-gray-700',
  'bg-gray-50 dark:bg-gray-800/50'
);

const groupTitleClasses = clsx(
  'flex items-center space-x-3 flex-1'
);

const groupIconClasses = clsx(
  'w-5 h-5 text-gray-600 dark:text-gray-400'
);

const groupNameClasses = clsx(
  'font-medium text-gray-900 dark:text-white'
);

const groupDescriptionClasses = clsx(
  'text-sm text-gray-500 dark:text-gray-400'
);

const groupActionsClasses = clsx(
  'flex items-center space-x-2'
);

const groupContentClasses = clsx(
  'divide-y divide-gray-100 dark:divide-gray-800'
);

const toggleButtonClasses = clsx(
  'p-1 hover:bg-gray-200 dark:hover:bg-gray-700',
  'rounded-sm transition-colors duration-200'
);

const bulkActionButtonClasses = clsx(
  'text-xs px-2 py-1 rounded-sm',
  'hover:bg-gray-200 dark:hover:bg-gray-700',
  'transition-colors duration-200'
);

// Icon mapping
const iconMap = {
  FileText,
  Users,
  Settings,
};

export function PermissionGroupComponent({
  group,
  permissionState,
  onPermissionChange,
  isExpanded,
  onToggleExpanded,
  disabled = false,
  searchTerm = ''
}: PermissionGroupProps) {
  const IconComponent = iconMap[group.icon as keyof typeof iconMap] || FileText;

  // Filter permissions based on search term
  const filteredPermissions = useMemo(() => {
    if (!searchTerm.trim()) {
      return group.permissions;
    }

    const search = searchTerm.toLowerCase();
    return group.permissions.filter(permission => {
      const name = formatPermissionName(permission).toLowerCase();
      const key = permission.toLowerCase();
      return name.includes(search) || key.includes(search);
    });
  }, [group.permissions, searchTerm]);

  // Calculate selection state
  const selectedCount = filteredPermissions.filter(permission =>
    permissionState[permission]
  ).length;

  const isAllSelected = selectedCount === filteredPermissions.length && filteredPermissions.length > 0;
  const isPartiallySelected = selectedCount > 0 && selectedCount < filteredPermissions.length;

  // Handle bulk actions
  const handleSelectAll = () => {
    if (disabled) return;

    filteredPermissions.forEach(permission => {
      onPermissionChange(permission, true);
    });
  };

  const handleSelectNone = () => {
    if (disabled) return;

    filteredPermissions.forEach(permission => {
      onPermissionChange(permission, false);
    });
  };

  const handleToggleAll = () => {
    if (disabled) return;

    if (isAllSelected) {
      handleSelectNone();
    } else {
      handleSelectAll();
    }
  };

  // Don't render if no permissions match search
  if (filteredPermissions.length === 0 && searchTerm.trim()) {
    return null;
  }

  return (
    <div className={groupContainerClasses}>
      {/* Group Header */}
      <div className={groupHeaderClasses}>
        <div className={groupTitleClasses}>
          <button
            type="button"
            onClick={onToggleExpanded}
            className={toggleButtonClasses}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${group.name}`}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          <IconComponent className={groupIconClasses} />

          <div className="flex-1">
            <div className={groupNameClasses}>
              {group.name}
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                ({selectedCount}/{filteredPermissions.length})
              </span>
            </div>
            <div className={groupDescriptionClasses}>
              {group.description}
            </div>
          </div>
        </div>

        <div className={groupActionsClasses}>
          {/* Bulk selection checkbox */}
          <Checkbox
            isSelected={isAllSelected}
            isIndeterminate={isPartiallySelected}
            onValueChange={handleToggleAll}
            isDisabled={disabled || filteredPermissions.length === 0}
            color="primary"
            size="sm"
            aria-label={`Select all ${group.name} permissions`}
          />

          {/* Bulk action buttons */}
          {isExpanded && !disabled && (
            <>
              <Button
                size="sm"
                variant="light"
                onPress={handleSelectAll}
                isDisabled={isAllSelected || filteredPermissions.length === 0}
                className={bulkActionButtonClasses}
              >
                All
              </Button>
              <Button
                size="sm"
                variant="light"
                onPress={handleSelectNone}
                isDisabled={selectedCount === 0}
                className={bulkActionButtonClasses}
              >
                None
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Group Content */}
      {isExpanded && (
        <div className={groupContentClasses}>
          {filteredPermissions.map(permission => (
            <PermissionCheckbox
              key={permission}
              permission={permission}
              isSelected={permissionState[permission] || false}
              onChange={onPermissionChange}
              disabled={disabled}
              showDescription={true}
            />
          ))}

          {filteredPermissions.length === 0 && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No permissions available
            </div>
          )}
        </div>
      )}
    </div>
  );
}