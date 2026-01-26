import { z } from 'zod';
import { ITEM_VALIDATION } from '@/lib/types/item';
import { locationSchema } from './item';

// Item status options
export const itemStatus = ['pending', 'approved', 'rejected'] as const;
export const clientStatusFilter = ['all', 'pending', 'approved', 'rejected'] as const;

/**
 * Schema for updating a client item
 * Only allows fields that clients are permitted to modify
 */
export const clientUpdateItemSchema = z.object({
  name: z
    .string()
    .min(ITEM_VALIDATION.NAME_MIN_LENGTH, `Name must be at least ${ITEM_VALIDATION.NAME_MIN_LENGTH} characters`)
    .max(ITEM_VALIDATION.NAME_MAX_LENGTH, `Name must be at most ${ITEM_VALIDATION.NAME_MAX_LENGTH} characters`)
    .optional(),
  description: z
    .string()
    .min(ITEM_VALIDATION.DESCRIPTION_MIN_LENGTH, `Description must be at least ${ITEM_VALIDATION.DESCRIPTION_MIN_LENGTH} characters`)
    .max(ITEM_VALIDATION.DESCRIPTION_MAX_LENGTH, `Description must be at most ${ITEM_VALIDATION.DESCRIPTION_MAX_LENGTH} characters`)
    .optional(),
  source_url: z
    .string()
    .url('Invalid URL format')
    .optional(),
  category: z
    .union([
      z.string().min(1, 'Category is required'),
      z.array(z.string().min(1)).min(1, 'At least one category is required'),
    ])
    .optional(),
  tags: z
    .array(z.string().min(1))
    .optional(),
  icon_url: z
    .string()
    .url('Invalid icon URL format')
    .optional()
    .or(z.literal('')),
  location: locationSchema,
});

/**
 * Schema for client items list query parameters
 */
export const clientItemsListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 1))
    .refine(val => !Number.isNaN(val), { message: 'Page must be a valid number' })
    .refine(val => val >= 1, { message: 'Page must be at least 1' }),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 10))
    .refine(val => !Number.isNaN(val), { message: 'Limit must be a valid number' })
    .refine(val => val >= 1 && val <= 100, { message: 'Limit must be between 1 and 100' }),
  status: z
    .enum(clientStatusFilter)
    .optional()
    .default('all'),
  search: z
    .string()
    .max(100, 'Search query is too long')
    .optional(),
  sortBy: z
    .enum(['name', 'updated_at', 'status', 'submitted_at'])
    .optional()
    .default('updated_at'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc'),
  deleted: z
    .string()
    .optional()
    .transform(val => val === 'true'),
});

/**
 * Schema for item ID parameter
 */
export const itemIdParamSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
});

/**
 * Schema for creating a client item submission
 * Required fields: name, description, source_url
 */
export const clientCreateItemSchema = z.object({
  name: z
    .string()
    .min(ITEM_VALIDATION.NAME_MIN_LENGTH, `Name must be at least ${ITEM_VALIDATION.NAME_MIN_LENGTH} characters`)
    .max(ITEM_VALIDATION.NAME_MAX_LENGTH, `Name must be at most ${ITEM_VALIDATION.NAME_MAX_LENGTH} characters`),
  description: z
    .string()
    .min(ITEM_VALIDATION.DESCRIPTION_MIN_LENGTH, `Description must be at least ${ITEM_VALIDATION.DESCRIPTION_MIN_LENGTH} characters`)
    .max(ITEM_VALIDATION.DESCRIPTION_MAX_LENGTH, `Description must be at most ${ITEM_VALIDATION.DESCRIPTION_MAX_LENGTH} characters`),
  source_url: z
    .string()
    .url('Invalid URL format'),
  category: z
    .union([
      z.string().min(1, 'Category is required'),
      z.array(z.string().min(1)).min(1, 'At least one category is required'),
    ])
    .optional()
    .nullable(),
  tags: z
    .array(z.string().min(1))
    .optional()
    .default([]),
  icon_url: z
    .string()
    .url('Invalid icon URL format')
    .optional()
    .or(z.literal('')),
  location: locationSchema,
});

// Inferred types
export type ClientUpdateItemInput = z.infer<typeof clientUpdateItemSchema>;
export type ClientCreateItemInput = z.infer<typeof clientCreateItemSchema>;
export type ClientItemsListQueryInput = z.infer<typeof clientItemsListQuerySchema>;
export type ItemIdParamInput = z.infer<typeof itemIdParamSchema>;
