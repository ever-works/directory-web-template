import { useState, useCallback } from 'react';
import { ItemData } from '@/lib/types/item';
import { FeaturedItem } from './use-admin-featured-items';

interface FeaturedItemFormData {
  itemSlug: string;
  itemName: string;
  itemIconUrl: string;
  itemCategory: string;
  itemDescription: string;
  featuredOrder: number;
  featuredUntil: string;
  isActive: boolean;
}

interface UseFeaturedItemFormOptions {
  allItems: ItemData[];
  onSubmit: (data: FeaturedItemFormData) => Promise<boolean>;
  onCancel?: () => void;
}

interface UseFeaturedItemFormReturn {
  // Form state
  formData: FeaturedItemFormData;
  isEditMode: boolean;
  isSubmitting: boolean;
  
  // Form actions
  setFormData: React.Dispatch<React.SetStateAction<FeaturedItemFormData>>;
  handleInputChange: (field: keyof FeaturedItemFormData, value: any) => void;
  handleItemSelect: (itemSlug: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  resetForm: () => void;
  
  // Modal actions
  openCreateModal: () => void;
  openEditModal: (item: FeaturedItem) => void;
  closeModal: () => void;
  
  // Validation
  isFormValid: boolean;
  errors: Record<string, string>;
}

const initialFormData: FeaturedItemFormData = {
  itemSlug: "",
  itemName: "",
  itemIconUrl: "",
  itemCategory: "",
  itemDescription: "",
  featuredOrder: 0,
  featuredUntil: "",
  isActive: true,
};

export function useFeaturedItemForm({
  allItems,
  onSubmit,
  onCancel,
}: UseFeaturedItemFormOptions): UseFeaturedItemFormReturn {
  const [formData, setFormData] = useState<FeaturedItemFormData>(initialFormData);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle input changes
  const handleInputChange = useCallback((field: keyof FeaturedItemFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'isActive' ? Boolean(value) : value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  }, [errors]);

  // Handle item selection from dropdown
  const handleItemSelect = useCallback((itemSlug: string) => {
    const item = allItems.find(i => i.slug === itemSlug);
    if (item) {
      setFormData(prev => ({
        ...prev,
        itemSlug: item.slug,
        itemName: item.name,
        itemIconUrl: item.icon_url || "",
        itemCategory: Array.isArray(item.category) 
          ? (typeof item.category[0] === 'string' ? item.category[0] : String(item.category[0]) || '')
          : (typeof item.category === 'string' ? item.category : String(item.category) || ''),
        itemDescription: (item.description || '').substring(0, 200), // Limit to 200 characters
      }));
    }
  }, [allItems]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.itemSlug) {
      newErrors.itemSlug = 'Please select an item';
    }

    if (!formData.itemName.trim()) {
      newErrors.itemName = 'Item name is required';
    }

    if (formData.itemDescription.length > 200) {
      newErrors.itemDescription = 'Description must be 200 characters or less';
    }

    if (formData.featuredOrder < 0) {
      newErrors.featuredOrder = 'Order must be 0 or greater';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setIsEditMode(false);
    setErrors({});
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const success = await onSubmit(formData);
      if (success) {
        resetForm();
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSubmit, resetForm]);

  // Open create modal
  const openCreateModal = useCallback(() => {
    resetForm();
  }, [resetForm]);

  // Open edit modal
  const openEditModal = useCallback((item: FeaturedItem) => {
    setFormData({
      itemSlug: item.itemSlug,
      itemName: item.itemName,
      itemIconUrl: item.itemIconUrl || "",
      itemCategory: item.itemCategory || "",
      itemDescription: item.itemDescription || "",
      featuredOrder: item.featuredOrder,
      featuredUntil: item.featuredUntil ? new Date(item.featuredUntil).toISOString().slice(0, 16) : "",
      isActive: item.isActive,
    });
    setIsEditMode(true);
    setErrors({});
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    resetForm();
    onCancel?.();
  }, [resetForm, onCancel]);

  // Check if form is valid
  const isFormValid = Boolean(formData.itemSlug && formData.itemName.trim() && Object.keys(errors).length === 0);

  return {
    // Form state
    formData,
    isEditMode,
    isSubmitting,
    
    // Form actions
    setFormData,
    handleInputChange,
    handleItemSelect,
    handleSubmit,
    resetForm,
    
    // Modal actions
    openCreateModal,
    openEditModal,
    closeModal,
    
    // Validation
    isFormValid,
    errors,
  };
}
