import { z } from "zod";

export const companyStatus = ["active", "inactive"] as const;

export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(255),
  website: z.string().url("Invalid URL format").optional().or(z.literal("")),
  domain: z
    .string()
    .max(255)
    .optional()
    .transform((val) => val?.toLowerCase().trim() || undefined),
  slug: z
    .string()
    .max(255)
    .optional()
    .transform((val) => val?.toLowerCase().trim() || undefined)
    .refine(
      (val) => !val || /^[a-z0-9-]+$/.test(val),
      { message: "Slug must contain only lowercase letters, numbers, and hyphens" }
    ),
  status: z.enum(companyStatus).default("active"),
});

export const updateCompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Company name is required").max(255).optional(),
  website: z.string().url("Invalid URL format").optional().or(z.literal("")),
  domain: z
    .string()
    .max(255)
    .optional()
    .transform((val) => val?.toLowerCase().trim() || undefined),
  slug: z
    .string()
    .max(255)
    .optional()
    .transform((val) => val?.toLowerCase().trim() || undefined)
    .refine(
      (val) => !val || /^[a-z0-9-]+$/.test(val),
      { message: "Slug must contain only lowercase letters, numbers, and hyphens" }
    ),
  status: z.enum(companyStatus).optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

// ######################### Item-Company Association Schemas #########################

export const assignCompanyToItemSchema = z.object({
  itemSlug: z
    .string()
    .min(1, "Item slug is required")
    .max(255)
    .transform((val) => val.toLowerCase().trim()),
  companyId: z.string().uuid("Invalid company ID format"),
});

// Reuse assignCompanyToItemSchema for updates (identical validation requirements)
export const updateItemCompanySchema = assignCompanyToItemSchema;

export const removeCompanyFromItemSchema = z.object({
  itemSlug: z
    .string()
    .min(1, "Item slug is required")
    .max(255)
    .transform((val) => val.toLowerCase().trim()),
});

export type AssignCompanyToItemInput = z.infer<typeof assignCompanyToItemSchema>;
export type UpdateItemCompanyInput = AssignCompanyToItemInput;
export type RemoveCompanyFromItemInput = z.infer<typeof removeCompanyFromItemSchema>;
