"use client";

import { useState, useEffect } from "react";
import { Save, X, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collection, CreateCollectionRequest, UpdateCollectionRequest, COLLECTION_VALIDATION } from "@/types/collection";

interface CollectionFormProps {
  collection?: Collection;
  mode: "create" | "edit";
  isLoading?: boolean;
  onSubmit: (data: CreateCollectionRequest | UpdateCollectionRequest) => Promise<void>;
  onCancel: () => void;
}

const SPINNER = (
  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ─── Shared input classes ─────────────────────────────────────────────────────

const INPUT_BASE = cn(
  "w-full h-10 px-3 text-sm rounded-xl",
  "bg-white dark:bg-white/3",
  "border border-gray-200 dark:border-white/8",
  "text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
  "focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/20",
  "transition-all duration-150",
  "disabled:opacity-50 disabled:cursor-not-allowed"
);

const INPUT_ERROR = cn(
  INPUT_BASE,
  "border-red-400 dark:border-red-500/60 focus:ring-red-500/20 focus:border-red-400"
);

const TEXTAREA_BASE = cn(
  "w-full px-3 py-2.5 text-sm rounded-xl resize-none",
  "bg-white dark:bg-white/3",
  "border border-gray-200 dark:border-white/8",
  "text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
  "focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/20",
  "transition-all duration-150",
  "disabled:opacity-50 disabled:cursor-not-allowed"
);

// ─── Field wrapper ────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {!error && hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent",
          "transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-white focus-visible:ring-offset-2",
          checked ? "bg-gray-900 dark:bg-white" : "bg-gray-200 dark:bg-white/20"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full shadow-sm",
            "bg-white dark:bg-gray-900",
            "transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

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

    const payload = mode === "edit"
      ? ({ ...formData, slug: formData.id, id: formData.id } as UpdateCollectionRequest)
      : ({ ...formData, slug: formData.id } as CreateCollectionRequest);

    await onSubmit(payload);
  };

  return (
    <div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/8 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/1.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0 ring-1 ring-violet-100 dark:ring-violet-500/20">
            <Layers className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
              {mode === "create" ? "Create Collection" : "Edit Collection"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {mode === "create"
                ? "Add a new collection to organize directory items"
                : "Update collection details and visibility"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          aria-label="Close"
          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-white/8 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Collection ID */}
        <Field
          label="Collection ID"
          required
          hint="Lowercase, URL-friendly identifier (used as slug)"
          error={errors.id}
        >
          <input
            type="text"
            placeholder="e.g. frontend-frameworks"
            value={formData.id}
            onChange={(e) => handleChange("id", e.target.value)}
            disabled={mode === "edit" || isLoading}
            className={errors.id ? INPUT_ERROR : INPUT_BASE}
          />
        </Field>

        {/* Name + Icon row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name" required error={errors.name}>
            <input
              type="text"
              placeholder="Collection name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              disabled={isLoading}
              className={errors.name ? INPUT_ERROR : INPUT_BASE}
            />
          </Field>

          <Field label="Icon (emoji or URL)">
            <input
              type="text"
              placeholder="🤖"
              value={formData.icon_url}
              onChange={(e) => handleChange("icon_url", e.target.value)}
              disabled={isLoading}
              className={INPUT_BASE}
            />
          </Field>
        </div>

        {/* Description */}
        <Field label="Description" hint={`${formData.description.length} / ${COLLECTION_VALIDATION.DESCRIPTION_MAX_LENGTH}`} error={errors.description}>
          <textarea
            placeholder="Short description shown on the collections page"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            maxLength={COLLECTION_VALIDATION.DESCRIPTION_MAX_LENGTH}
            rows={3}
            disabled={isLoading}
            className={errors.description ? cn(TEXTAREA_BASE, "border-red-400 dark:border-red-500/60 focus:ring-red-500/20") : TEXTAREA_BASE}
          />
        </Field>

        {/* Footer actions */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-white/8 -mx-6 -mb-6 px-6 py-4 bg-gray-50/40 dark:bg-white/1.5">
          <Toggle
            checked={formData.isActive}
            onChange={(v) => handleChange("isActive", v)}
            label="Active"
          />

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-all duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-[#121212]"
            >
              {isLoading ? SPINNER : <Save className="w-4 h-4" />}
              {mode === "create" ? "Create Collection" : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
