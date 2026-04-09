import { PaymentPlan } from '@/lib/constants';
import { Eye, FileText, Globe, Tag, Type } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCategoriesEnabled } from './use-categories-enabled';
import { useTagsEnabled } from './use-tags-enabled';
import { useLocationSettings } from './use-location-settings';
import { STEP_DEFINITIONS } from '@/components/directory/details-form/validation/form-validators';
interface ProductLink {
    id: string;
    url: string;
    label: string;
    type: "main" | "secondary";
    icon?: string;
  }
  
  interface FormData {
    name: string;
    link: string;
    links: ProductLink[];
    category: string | null;
    tags: string[];
    description: string;
    introduction: string;
    [key: string]: any;
  }
  
  export interface DetailsFormProps {
    initialData?: Partial<FormData>;
    selectedPlan: PaymentPlan | null;
    onSubmit: (data: FormData) => void;
    onBack: () => void;
  }
  
  export const CATEGORIES = [
    "AI Tools",
    "Analytics",
    "API",
    "Automation",
    "Business",
    "Content",
    "Design",
    "Development",
    "E-commerce",
    "Education",
    "Finance",
    "Health",
    "Marketing",
    "Productivity",
    "Security",
    "Social",
    "Other",
  ];
  
  export const TAGS = [
    "Free",
    "Paid",
    "Open Source",
    "SaaS",
    "Mobile",
    "Desktop",
    "Web",
    "API",
    "AI",
    "Machine Learning",
    "Automation",
    "No-Code",
    "Low-Code",
    "Developer Tools",
    "Business Tools",
  ];
  
  export const STEPS = [
    {
      id: 1,
      title: "BASIC_INFO",
      description: "BASIC_INFO_DESC",
      icon: Type,
      fields: ["name", "mainLink"],
      color: "from-blue-500 to-purple-500"
    },
    {
      id: 2,
      title: "CATEGORY_TAGS",
      description: "CATEGORY_TAGS_DESC",
      icon: Tag,
      fields: ["category"],
      color: "from-purple-500 to-pink-500"
    },
    {
      id: 3,
      title: "DESCRIPTION",
      description: "DESCRIPTION_DESC",
      icon: FileText,
      fields: ["description"],
      color: "from-green-500 to-emerald-500"
    },
    {
      id: 4,
      title: "REVIEW",
      description: "REVIEW_DESC",
      icon: Eye,
      fields: [],
      color: "from-orange-500 to-red-500"
    }
  ];
  
export function useDetailForm(initialData: Partial<FormData>, onSubmit: (data: FormData) => void) {
    const { categoriesEnabled } = useCategoriesEnabled();
    const { tagsEnabled } = useTagsEnabled();
    const { settings: locationSettings } = useLocationSettings();
    const locationRequired = locationSettings.enabled && locationSettings.requireLocationOnSubmit;
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<FormData>(() => {
      const defaultData = {
        name: "",
        link: "",
        links: [
          {
            id: "main-link",
            url: "",
            label: "Main Website",
            type: "main" as const,
            icon: "Globe",
          },
        ],
        category: "",
        tags: [],
        description: "",
        introduction: "",
      };
  
      // Merge with initialData and sync link field with main link
      const mergedData = { ...defaultData, ...initialData };
  
      // If initialData has a link field, sync it with the main link
      if (initialData.link && mergedData.links[0]) {
        mergedData.links[0].url = initialData.link;
      }
  
      // Ensure link field is synced with main link URL
      const mainLink = mergedData.links.find((l) => l.type === "main");
      mergedData.link = mainLink?.url || "";
  
      return mergedData;
    });
  
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [completedFields, setCompletedFields] = useState<Set<string>>(
      new Set()
    );
    const [animatingLinkId, setAnimatingLinkId] = useState<string | null>(null);
    const animationTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const scheduleAnimationTimeout = useCallback((callback: () => void, delay: number) => {
      const timeoutId = setTimeout(() => {
        animationTimeoutsRef.current = animationTimeoutsRef.current.filter((id) => id !== timeoutId);
        callback();
      }, delay);

      animationTimeoutsRef.current.push(timeoutId);
    }, []);

    useEffect(() => {
      return () => {
        animationTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
        animationTimeoutsRef.current = [];
      };
    }, []);

    // Auto-sync programmatically-set fields to completedFields
    useEffect(() => {
      setCompletedFields((prev) => {
        const next = new Set(prev);

        // Sync 'link' from main link URL
        const mainLink = formData.links.find((l) => l.type === 'main');
        if (mainLink?.url?.trim()) {
          next.add('link');
        } else {
          next.delete('link');
        }

        // Sync 'name'
        if (formData.name?.trim()) {
          next.add('name');
        } else {
          next.delete('name');
        }

        // Sync 'description'
        if (formData.description?.trim()) {
          next.add('description');
        } else {
          next.delete('description');
        }

        // Sync 'introduction'
        if (formData.introduction?.trim()) {
          next.add('introduction');
        } else {
          next.delete('introduction');
        }

        // Sync 'tags'
        if (Array.isArray(formData.tags) && formData.tags.length > 0) {
          next.add('tags');
        } else {
          next.delete('tags');
        }

        // Sync 'category'
        if (formData.category?.trim()) {
          next.add('category');
        } else {
          next.delete('category');
        }

        // Sync 'selectedPlan'
        if (formData.selectedPlan && formData.selectedPlan.trim()) {
          next.add('selectedPlan');
        } else {
          next.delete('selectedPlan');
        }

        return next;
      });
    }, [formData.name, formData.description, formData.introduction, formData.tags, formData.category, formData.links, formData.selectedPlan]);
  
    const handleInputChange = useCallback(
      (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
      ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
  
        // Track completed fields with debouncing
        if (value.trim()) {
          setCompletedFields((prev) => new Set([...prev, name]));
        } else {
          setCompletedFields((prev) => {
            const newSet = new Set([...prev]);
            newSet.delete(name);
            return newSet;
          });
        }
      },
      []
    );
  
    const handleLinkChange = useCallback(
      (id: string, field: "url" | "label", value: string) => {
        setFormData((prev) => {
          const updatedLinks = prev.links.map((link) =>
            link.id === id ? { ...link, [field]: value } : link
          );
  
          // Sync main link URL with backward compatibility field
          const mainLink = updatedLinks.find((l) => l.type === "main");
  
          return {
            ...prev,
            links: updatedLinks,
            link: mainLink?.url || "", // Always sync with main link URL
          };
        });
  
        // Track main link completion
        const mainLink = formData.links.find((l) => l.type === "main");
        if (mainLink?.id === id && field === "url") {
          if (value.trim()) {
            setCompletedFields((prev) => new Set([...prev, "link"]));
          } else {
            setCompletedFields((prev) => {
              const newSet = new Set([...prev]);
              newSet.delete("link");
              return newSet;
            });
          }
        }
      },
      [formData.links]
    );
  
    const addLink = useCallback(() => {
      const newId = `link-${Date.now()}`;
      setAnimatingLinkId(newId);
  
      setFormData((prev) => ({
        ...prev,
        links: [
          ...prev.links,
          {
            id: newId,
            url: "",
            label: "Additional Link",
            type: "secondary" as const,
            icon: "Globe",
          },
        ],
      }));
      scheduleAnimationTimeout(() => setAnimatingLinkId(null), 500);
    }, [scheduleAnimationTimeout]);
  
    const removeLink = useCallback(
      (id: string) => {
        const linkToRemove = formData.links.find((l) => l.id === id);
        if (linkToRemove?.type === "main") return; // Don't remove main link
  
        setAnimatingLinkId(id);

        // Delay removal for exit animation
        scheduleAnimationTimeout(() => {
          setFormData((prev) => ({
            ...prev,
            links: prev.links.filter((link) => link.id !== id),
          }));
          setAnimatingLinkId(null);
        }, 300);
      },
      [formData.links, scheduleAnimationTimeout]
    );
  
    const handleTagToggle = useCallback((tag: string) => {
      setFormData((prev) => {
        const currentTags = [...prev.tags];
        if (currentTags.includes(tag)) {
          return { ...prev, tags: currentTags.filter((t) => t !== tag) };
        } else {
          return { ...prev, tags: [...currentTags, tag] };
        }
      });
    }, []);
  
    const handleSubmit = useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();

        const mainLink = formData.links.find((l) => l.type === "main");
        const transformedData = {
          ...formData,
          link: mainLink?.url || "",
          links: formData.links,
          // Set category to null if categories are disabled
          category: categoriesEnabled ? formData.category : null,
          // Set tags to empty array if tags are disabled
          tags: tagsEnabled ? formData.tags : [],
        };

        onSubmit?.(transformedData);
      },
      [formData, onSubmit, categoriesEnabled, tagsEnabled]
    );
  
    const validateStep = useCallback((step: number) => {
      const stepConfig = STEP_DEFINITIONS.find(s => s.id === step);
      if (!stepConfig) return false;

      const fieldsValid = stepConfig.fields.length === 0 || stepConfig.fields.every(field => {
        return formData[field] && formData[field].toString().trim();
      });

      if (!fieldsValid) return false;

      // Enforce location on step 1 when requireLocationOnSubmit is enabled
      if (step === 1 && locationRequired) {
        const loc = formData.location;
        if (!loc) return false;
        // Valid if remote, or if coordinates are present
        if (!loc.is_remote && (loc.latitude === undefined || loc.longitude === undefined)) {
          return false;
        }
      }

      return true;
    }, [formData, locationRequired]);
  
    const nextStep = useCallback(() => {
      if (currentStep < STEP_DEFINITIONS.length && validateStep(currentStep)) {
        setCurrentStep(prev => prev + 1);
      }
    }, [currentStep, validateStep]);
  
    const prevStep = useCallback(() => {
      if (currentStep > 1) {
        setCurrentStep(prev => prev - 1);
      }
    }, [currentStep]);
  
    // Global progress calculation
    const { progressPercentage, completedRequiredFields, requiredFieldsCount, requiredFields } =
      useMemo(() => {
        // Required fields: name, mainLink, description (category only if enabled)
        const requiredFields: string[] = categoriesEnabled
          ? ["name", "link", "category", "description"]
          : ["name", "link", "description"];

        if (locationRequired) {
          requiredFields.push("location");
        }

        const completed = requiredFields.filter(
          (field) => {
            if (field === "location") {
              const loc = formData.location;
              if (!loc) return false;
              return loc.is_remote || (loc.latitude !== undefined && loc.longitude !== undefined);
            }
            return formData[field] && formData[field].toString().trim();
          }
        ).length;

        return {
          requiredFieldsCount: requiredFields.length,
          completedRequiredFields: completed,
          progressPercentage: (completed / requiredFields.length) * 100,
          requiredFields,
        };
      }, [formData, categoriesEnabled, locationRequired]);
  
    const getIconComponent = () => {
      return Globe;
    };

    return {
        currentStep,
        formData,
        focusedField,
        completedFields,
        animatingLinkId,
        handleInputChange,
        handleLinkChange,
        addLink,
        removeLink,
        handleTagToggle,
        handleSubmit,
        nextStep,
        prevStep,
        progressPercentage,
        completedRequiredFields,
        requiredFieldsCount,
        requiredFields,
        getIconComponent,
        validateStep,
       setCurrentStep,
        setFormData,
        setAnimatingLinkId,
        setFocusedField
    
    }
}
