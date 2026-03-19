'use client';

import { useState, useEffect } from 'react';
import { useCreateUser, useUpdateUser, useCheckUsername, useCheckEmail } from '@/hooks/use-users';
import { useActiveRoles } from '@/hooks/use-active-roles';
import { UserData, CreateUserRequest, UpdateUserRequest } from '@/lib/types/user';
import { Button, Input } from '@heroui/react';
import * as Select from '@radix-ui/react-select';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, ChevronDown, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface UserFormProps {
  user?: UserData;
  onSuccess: (data: CreateUserRequest | UpdateUserRequest) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export default function UserForm({ user, onSuccess, isSubmitting = false, onCancel }: UserFormProps) {
  const t = useTranslations('admin.USER_FORM');
  
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const checkUsernameMutation = useCheckUsername();
  const checkEmailMutation = useCheckEmail();

  // Get loading states from mutations
  const isCreatingUser = createUserMutation.isPending;
  const isUpdatingUser = updateUserMutation.isPending;
  const { roles, loading: rolesLoading, getActiveRoles } = useActiveRoles();

  const [showPassword, setShowPassword] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Track initial values to detect changes
  const initialEmail = user?.email || '';
  const initialUsername = user?.username || '';

  const isEditing = !!user;

  // Load active roles on component mount with proper cleanup
  useEffect(() => {
    const abortController = new AbortController();
    getActiveRoles(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [getActiveRoles]); // Include getActiveRoles in dependencies

  // Form state
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    name: user?.name || '',
    title: user?.title || '',
    avatar: user?.avatar || '',
    role: user?.role || '',
    status: user?.status || 'active',
    password: '',
  });


  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Check username availability
  useEffect(() => {
    const checkUsernameAvailability = async () => {
      // Skip check if username hasn't changed from initial value (for editing)
      if (isEditing && formData.username === initialUsername) {
        setUsernameAvailable(null);
        return;
      }

      if (!formData.username || formData.username.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      setCheckingUsername(true);
      try {
        const result = await checkUsernameMutation.mutateAsync({ 
          username: formData.username, 
          excludeId: user?.id 
        });
        setUsernameAvailable(result);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    };

    const timeoutId = setTimeout(checkUsernameAvailability, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.username, user?.id, checkUsernameMutation, isEditing, initialUsername]);

  // Check email availability
  useEffect(() => {
    const checkEmailAvailability = async () => {
      // Skip check if email hasn't changed from initial value (for editing)
      if (isEditing && formData.email === initialEmail) {
        setEmailAvailable(null);
        return;
      }

      if (!formData.email || !formData.email.includes('@')) {
        setEmailAvailable(null);
        return;
      }

      setCheckingEmail(true);
      try {
        const result = await checkEmailMutation.mutateAsync({ 
          email: formData.email, 
          excludeId: user?.id 
        });
        setEmailAvailable(result);
      } catch {
        setEmailAvailable(null);
      } finally {
        setCheckingEmail(false);
      }
    };

    const timeoutId = setTimeout(checkEmailAvailability, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.email, user?.id, checkEmailMutation, isEditing, initialEmail]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isSubmittingForm) {
      return;
    }

    // Validate required fields
    if (!formData.role) {
      toast.error(t('ERRORS.SELECT_ROLE'));
      return;
    }

    // For editing, only check availability if values have changed
    if (isEditing) {
      if (formData.username !== initialUsername && usernameAvailable === false) {
        toast.error(t('ERRORS.USERNAME_TAKEN'));
        return;
      }
      if (formData.email !== initialEmail && emailAvailable === false) {
        toast.error(t('ERRORS.EMAIL_TAKEN'));
        return;
      }
    } else {
      // For new users, check all availability
      if (usernameAvailable === false) {
        toast.error(t('ERRORS.USERNAME_TAKEN'));
        return;
      }
      if (emailAvailable === false) {
        toast.error(t('ERRORS.EMAIL_TAKEN'));
        return;
      }
    }

    setIsSubmittingForm(true);
    try {
      if (isEditing) {
        const updateData: UpdateUserRequest = {
          username: formData.username,
          email: formData.email,
          name: formData.name,
          title: formData.title,
          avatar: formData.avatar,
          role: formData.role,
          status: formData.status,
        };

        await updateUserMutation.mutateAsync({ 
          id: user.id, 
          userData: updateData 
        });
        onSuccess(updateData);
      } else {
        const createData: CreateUserRequest = {
          username: formData.username,
          email: formData.email,
          name: formData.name,
          title: formData.title,
          avatar: formData.avatar,
          role: formData.role,
          password: formData.password,
        };

        await createUserMutation.mutateAsync(createData);
        onSuccess(createData);
      }
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error(t('ERRORS.SAVE_FAILED'));
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const getUsernameStatus = () => {
    if (checkingUsername) return 'checking';
    if (usernameAvailable === null) return 'neutral';
    return usernameAvailable ? 'available' : 'unavailable';
  };

  const getEmailStatus = () => {
    if (checkingEmail) return 'checking';
    if (emailAvailable === null) return 'neutral';
    return emailAvailable ? 'available' : 'unavailable';
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {isEditing ? t('TITLE_EDIT') : t('TITLE_CREATE')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {isEditing ? t('SUBTITLE_EDIT') : t('SUBTITLE_CREATE')}
        </p>
      </div>

      <form onSubmit={onSubmit} className="p-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-linear-to-br from-theme-primary to-theme-accent flex items-center justify-center text-white text-lg font-semibold">
            {formData.name?.split(' ').map(n => n[0]).join('') || 'U'}
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{t('AVATAR_URL')}</label>
            <Input
              type="text"
              placeholder={t('AVATAR_PLACEHOLDER')}
              value={formData.avatar}
              onChange={(e) => handleInputChange('avatar', e.target.value)}
              disabled={isSubmittingForm}
              variant='bordered'
            />
          </div>
        </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">{t('FULL_NAME')} *</label>
          <Input
            type="text"
            placeholder={t('FULL_NAME_PLACEHOLDER')}
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            disabled={isSubmittingForm}
            required
            variant='bordered'
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('TITLE_FIELD')}</label>
          <Input
            type="text"
            placeholder={t('TITLE_PLACEHOLDER')}
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            disabled={isSubmittingForm}
            variant='bordered'
          />
        </div>
      </div>

      {/* Username and Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">{t('USERNAME')} *</label>
          <div className="relative">
            <Input
              type="text"
              placeholder={t('USERNAME_PLACEHOLDER')}
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              disabled={isSubmittingForm}
              required
              variant='bordered'
            />
            {checkingUsername && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {getUsernameStatus() === 'available' && (
            <p className="text-sm text-green-600 mt-1">{t('USERNAME_AVAILABLE')}</p>
          )}
          {getUsernameStatus() === 'unavailable' && (
            <p className="text-sm text-red-600 mt-1">{t('USERNAME_TAKEN')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('EMAIL')} *</label>
          <div className="relative">
            <Input
              type="email"
              placeholder={t('EMAIL_PLACEHOLDER')}
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={isSubmittingForm}
              required
              variant='bordered'
            />
            {checkingEmail && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {getEmailStatus() === 'available' && (
            <p className="text-sm text-green-600 mt-1">{t('EMAIL_AVAILABLE')}</p>
          )}
          {getEmailStatus() === 'unavailable' && (
            <p className="text-sm text-red-600 mt-1">{t('EMAIL_TAKEN')}</p>
          )}
        </div>
      </div>

      {/* Password (only for new users) */}
      {!isEditing && (
        <div>
          <label className="block text-sm font-medium mb-2">{t('PASSWORD')} *</label>
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder={t('PASSWORD_PLACEHOLDER')}
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            required
            disabled={isSubmittingForm}
            variant='bordered'
            endContent={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-w-0 w-8 h-8 p-0 bg-transparent hover:bg-transparent border-none shadow-none"
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            }
          />
        </div>
      )}

      {/* Role and Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">{t('ROLE')} *</label>
          <Select.Root
            value={formData.role}
            onValueChange={(value) => handleInputChange('role', value)}
            disabled={rolesLoading || isSubmittingForm}
          >
            <Select.Trigger
              className={cn(
                "flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-theme-primary-500",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <Select.Value placeholder={rolesLoading ? t('LOADING_ROLES') : t('SELECT_ROLE')} />
              <Select.Icon>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                className="overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                position="popper"
                sideOffset={4}
              >
                <Select.Viewport className="p-1">
                  {roles
                    .filter(role => role.status === 'active')
                    .map(role => (
                      <Select.Item
                        key={role.id}
                        value={role.id}
                        className="relative flex items-center px-8 py-2 text-sm rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 outline-none data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700"
                      >
                        <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                          <Check className="h-4 w-4" />
                        </Select.ItemIndicator>
                        <Select.ItemText>{role.name}</Select.ItemText>
                      </Select.Item>
                    ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {isEditing && (
          <div>
            <label className="block text-sm font-medium mb-2">{t('STATUS')} *</label>
            <Select.Root
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
              disabled={isSubmittingForm}
            >
              <Select.Trigger
                className={cn(
                  "flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-theme-primary-500",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                <Select.Value placeholder={t('SELECT_STATUS')} />
                <Select.Icon>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  className="overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                  position="popper"
                  sideOffset={4}
                >
                  <Select.Viewport className="p-1">
                    <Select.Item
                      value="active"
                      className="relative flex items-center px-8 py-2 text-sm rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 outline-none data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700"
                    >
                      <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                        <Check className="h-4 w-4" />
                      </Select.ItemIndicator>
                      <Select.ItemText>{t('ACTIVE')}</Select.ItemText>
                    </Select.Item>
                    <Select.Item
                      value="inactive"
                      className="relative flex items-center px-8 py-2 text-sm rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 outline-none data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700"
                    >
                      <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                        <Check className="h-4 w-4" />
                      </Select.ItemIndicator>
                      <Select.ItemText>{t('INACTIVE')}</Select.ItemText>
                    </Select.Item>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700 bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 -mx-6 -mb-6 px-6 pb-6">
        {onCancel && (
          <Button
            variant="bordered"
            onPress={onCancel}
            disabled={isSubmitting || isSubmittingForm || isCreatingUser || isUpdatingUser}
            className="px-4 py-2"
          >
{t('CANCEL')}
          </Button>
        )}
        <Button
          type="submit"
          color="primary"
          disabled={isSubmitting || isSubmittingForm || isCreatingUser || isUpdatingUser}
          className="px-4 py-2"
        >
          {(isSubmitting || isSubmittingForm || isCreatingUser || isUpdatingUser) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
{isEditing ? t('UPDATE_USER') : t('CREATE_USER')}
        </Button>
      </div>
    </form>
  </div>
    </>
  );
}