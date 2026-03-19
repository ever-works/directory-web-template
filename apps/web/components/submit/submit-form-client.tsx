'use client';

import { useState } from 'react';
import { DetailsForm } from "@/components/directory/details-form";
import { useRouter } from "next/navigation";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (data: FormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Get the main link URL from links array
      const mainLink = data.links?.find((link) => link.type === 'main');
      const sourceUrl = mainLink?.url || data.link;

      if (!sourceUrl) {
        toast.error('Please provide a valid URL for your item.');
        setIsSubmitting(false);
        return;
      }

      // Transform form data to API format
      const payload: ClientCreateItemRequest = {
        name: data.name,
        description: data.description,
        source_url: sourceUrl,
        category: data.category,
        tags: data.tags || [],
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
        throw new Error(result.error || 'Failed to submit item');
      }

      toast.success(result.message || 'Item submitted successfully!');

      // Redirect to submissions page
      router.push(`/${locale}/client/submissions`);

    } catch (error) {
      console.error('Error submitting form:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error submitting form. Please try again.';
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
