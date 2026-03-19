"use client";

import { useState, useEffect } from "react";
import { Button, Input, Switch, Textarea } from "@heroui/react";
import { Save, X } from "lucide-react";
import { Collection, CreateCollectionRequest, UpdateCollectionRequest, COLLECTION_VALIDATION } from "@/types/collection";

interface CollectionFormProps {
  collection?: Collection;
  mode: "create" | "edit";
  isLoading?: boolean;
  onSubmit: (data: CreateCollectionRequest | UpdateCollectionRequest) => Promise<void>;
  onCancel: () => void;
}

export function CollectionForm({ collection, mode, isLoading, onSubmit, onCancel }: CollectionFormProps) {
  const [formData, setFormData] = useState({
    id: collection?.id || "",
    name: collection?.name || "",
    description: collection?.description || "",
    icon_url: collection?.icon_url || "",
    isActive: collection?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData({
      id: collection?.id || "",
      name: collection?.name || "",
      description: collection?.description || "",
      icon_url: collection?.icon_url || "",
      isActive: collection?.isActive ?? true,
    });
    setErrors({});
  }, [collection, mode]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.id.trim()) {
      nextErrors.id = "ID is required";
    } else if (!/^[a-z0-9-]+$/.test(formData.id.trim())) {
      nextErrors.id = "Use lowercase letters, numbers, and hyphens";
    } else if (formData.id.trim().length < COLLECTION_VALIDATION.ID_MIN_LENGTH) {
      nextErrors.id = `ID must be at least ${COLLECTION_VALIDATION.ID_MIN_LENGTH} characters`;
    } else if (formData.id.trim().length > COLLECTION_VALIDATION.ID_MAX_LENGTH) {
      nextErrors.id = `ID must be under ${COLLECTION_VALIDATION.ID_MAX_LENGTH} characters`;
    }

    if (!formData.name.trim()) {
      nextErrors.name = "Name is required";
    } else if (formData.name.trim().length < COLLECTION_VALIDATION.NAME_MIN_LENGTH) {
      nextErrors.name = `Name must be at least ${COLLECTION_VALIDATION.NAME_MIN_LENGTH} characters`;
    } else if (formData.name.trim().length > COLLECTION_VALIDATION.NAME_MAX_LENGTH) {
      nextErrors.name = `Name must be under ${COLLECTION_VALIDATION.NAME_MAX_LENGTH} characters`;
    }

    if (formData.description.trim().length > COLLECTION_VALIDATION.DESCRIPTION_MAX_LENGTH) {
      nextErrors.description = `Description must be under ${COLLECTION_VALIDATION.DESCRIPTION_MAX_LENGTH} characters`;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    // Auto-generate slug from ID (they're the same)
    const payload = mode === "edit"
      ? ({ ...formData, slug: formData.id, id: formData.id } as UpdateCollectionRequest)
      : ({ ...formData, slug: formData.id } as CreateCollectionRequest);

    await onSubmit(payload);
  };

  const containerClasses = "bg-white dark:bg-gray-900";
  const headerClasses = "px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900";
  const formClasses = "p-6 space-y-6";
  const actionsClasses = "flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700 bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 -mx-6 -mb-6 px-6 pb-6";

  return (
    <div className={containerClasses}>
      <div className={headerClasses}>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {mode === "create" ? "Create Collection" : "Edit Collection"}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {mode === "create" 
            ? "Add a new collection to organize directory items" 
            : "Update collection details and visibility"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={formClasses}>
          <Input
            label="Collection ID"
            placeholder="e.g. frontend-frameworks"
            value={formData.id}
            onChange={(e) => handleChange("id", e.target.value)}
            errorMessage={errors.id}
            isInvalid={!!errors.id}
            isRequired
            isDisabled={mode === "edit"}
            description="Lowercase, URL-friendly identifier (used as slug)"
          />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Name"
            placeholder="Collection name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            errorMessage={errors.name}
            isInvalid={!!errors.name}
            isRequired
          />

          <Input
            label="Icon (emoji or URL)"
            placeholder="🤖"
            value={formData.icon_url}
            onChange={(e) => handleChange("icon_url", e.target.value)}
          />
        </div>

        <Textarea
          label="Description"
          placeholder="Short description shown on the collections page"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          errorMessage={errors.description}
          isInvalid={!!errors.description}
          maxLength={COLLECTION_VALIDATION.DESCRIPTION_MAX_LENGTH}
          minRows={3}
        />

        <div className={actionsClasses}>
          <Switch
            isSelected={formData.isActive}
            onValueChange={(value) => handleChange("isActive", value)}
            size="sm"
          >
            <span className="text-sm">Active</span>
          </Switch>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="flat"
              onPress={onCancel}
              isDisabled={isLoading}
              startContent={<X size={16} />}
              className="px-6 py-2 font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              color="primary"
              isLoading={isLoading}
              startContent={!isLoading && <Save size={16} />}
              className="px-6 py-2 font-medium bg-linear-to-r from-theme-primary to-theme-accent hover:from-theme-primary/90 hover:to-theme-accent/90 shadow-lg"
            >
              {mode === "create" ? "Create Collection" : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
