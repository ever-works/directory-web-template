'use client';

import { useState } from 'react';
import { DetailsForm } from "@/components/directory/details-form";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import { toast } from "sonner";
import type { Category, ItemData, Tag as TagType } from '@/lib/content';
import type { FormData } from '@/components/directory/details-form/validation/form-validators';
import type { ClientCreateItemRequest, ClientCreateItemResponse } from '@/lib/types/client-item';

interface SubmitFormClientProps {
  initialData: {
    items?: ItemData[];
    categories?: Category[];
    tags?: TagType[];
  };
  locale: string;
}

export function SubmitFormClient({ initialData, locale }: SubmitFormClientProps) {
  const router = useRouter();
  const t = useTranslations('directory.DETAILS_FORM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (data: FormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Get the main link URL from links array
      const mainLink = data.links?.find((link) => link.type === 'main');
      const sourceUrl = mainLink?.url || data.link;

      if (!sourceUrl) {
        toast.error(t('TOAST_INVALID_URL'));
        setIsSubmitting(false);
        return;
      }

      // The category picker is multi-select and stores every chosen id in the
      // plural `categories` array, while the singular `category` field only
      // holds the FIRST selected id. Submitting `category` alone silently drops
      // any additional categories the user picked (and that the Review step
      // shows back to them), so prefer the full array when it is present.
      const selectedCategories = Array.isArray(data.categories)
        ? (data.categories as unknown[]).filter(
            (c): c is string => typeof c === 'string' && c.trim().length > 0
          )
        : [];
      const category: ClientCreateItemRequest['category'] =
        selectedCategories.length > 0
          ? selectedCategories
          : typeof data.category === 'string' && data.category.trim()
            ? data.category
            : null;

      // Transform form data to API format
      const payload: ClientCreateItemRequest = {
        name: data.name,
        description: data.description,
        source_url: sourceUrl,
        category,
        tags: data.tags || [],
        // Location is collected by LocationFields (and can be a required gate
        // when `requireLocationOnSubmit` is enabled) and is persisted by the
        // API/repository — include it so it is not silently discarded.
        ...(data.location ? { location: data.location } : {}),
      };

      const response = await fetch('/api/client/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result: ClientCreateItemResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('TOAST_SUBMIT_FAILED'));
      }

      toast.success(result.message || t('TOAST_SUBMIT_SUCCESS'));

      // Redirect to submissions page
      router.push(`/${locale}/client/submissions`);

    } catch (error) {
      console.error('Error submitting form:', error);
      const errorMessage = error instanceof Error ? error.message : t('TOAST_SUBMIT_ERROR');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/${locale}/pricing`);
  };

  return (
    <DetailsForm
      onSubmit={handleFormSubmit}
      onBack={handleBack}
      listingProps={initialData}
      isSubmitting={isSubmitting}
    />
  );
}
