// Validation utilities for Lemonsqueezy checkout API

import { VALIDATION_MESSAGES } from './types';

/**
 * Validates email format using a minimal `[^@]+@[^@]+\.[^@]+` regex.
 *
 * **There are THREE `isValidEmail` implementations in this repo with
 * different strictness — pick the right one for your use case:**
 *
 * 1. {@link import('@/lib/utils/email-validation').isValidEmail} — the
 *    strict one. Enforces 5–254 char overall length, 1–64 char local
 *    part, valid-domain-structure checks, ReDoS-safe non-backtracking
 *    patterns. Use this for admin-side validation, account creation,
 *    or anywhere a permissive accept would let a typo land in the DB.
 * 2. **This function** — minimal regex. Accepts most things that
 *    "look like" an email but doesn't enforce length, multi-dot
 *    domains, or character-class limits. Kept for the LemonSqueezy
 *    checkout API path where the upstream payment provider does its
 *    own canonical validation server-side and we just want to reject
 *    obvious typos client-side.
 * 3. `PolarProvider.isValidEmail` (private method on
 *    `apps/web/lib/payment/lib/providers/polar-provider.ts`) — a
 *    third regex with provider-specific tuning.
 *
 * If you're not in a payment provider's checkout codepath, prefer #1.
 *
 * @param email - Email string to validate.
 * @returns `true` for "looks like an email", `false` otherwise.
 */
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Validates custom price
 * @param price - Price value to validate
 * @returns boolean indicating if price is valid
 */
export function isValidCustomPrice(price: any): boolean {
	if (price === undefined || price === null) return true; // Optional field

	const numPrice = Number(price);
	return !isNaN(numPrice) && numPrice >= 0 && Number.isInteger(numPrice);
}

/**
 * Validates variant ID
 * @param variantId - Variant ID to validate
 * @returns boolean indicating if variant ID is valid
 */
export function isValidVariantId(variantId: any): boolean {
	if (variantId === undefined || variantId === null) return true; // Optional field

	const numVariantId = Number(variantId);
	return !isNaN(numVariantId) && numVariantId > 0 && Number.isInteger(numVariantId);
}

/**
 * Validates metadata JSON string
 * @param metadata - Metadata string to validate
 * @returns object with isValid boolean and parsed data or error message
 */
export function validateMetadata(metadata: string | null | undefined): {
	isValid: boolean;
	data?: Record<string, any>;
	error?: string;
} {
	if (!metadata) {
		return { isValid: true, data: {} };
	}

	try {
		const parsed = JSON.parse(metadata);
		if (typeof parsed !== 'object' || parsed === null) {
			return {
				isValid: false,
				error: VALIDATION_MESSAGES.INVALID_METADATA
			};
		}
		return { isValid: true, data: parsed };
	} catch {
		return {
			isValid: false,
			error: VALIDATION_MESSAGES.INVALID_METADATA
		};
	}
}

/**
 * Comprehensive validation for checkout request body
 * @param body - Request body to validate
 * @returns object with isValid boolean and validation errors if any
 */
export function validateCheckoutRequestBody(body: any): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Check if body exists
	if (!body || typeof body !== 'object') {
		errors.push('Request body is required and must be an object');
		return { isValid: false, errors };
	}

	// Validate custom price
	if (body.customPrice !== undefined && !isValidCustomPrice(body.customPrice)) {
		errors.push(VALIDATION_MESSAGES.INVALID_PRICE);
	}

	// Validate variant ID
	if (body.variantId !== undefined && !isValidVariantId(body.variantId)) {
		errors.push(VALIDATION_MESSAGES.INVALID_VARIANT_ID);
	}

	// Validate and coerce dark field
	if (body.dark !== undefined) {
		if (typeof body.dark === 'string') {
			// Coerce string values to boolean
			if (body.dark === 'true') {
				body.dark = true;
			} else if (body.dark === 'false') {
				body.dark = false;
			} else {
				errors.push('Invalid dark value: must be a boolean or "true"/"false" string');
			}
		} else if (typeof body.dark !== 'boolean') {
			errors.push('Invalid dark value: must be a boolean');
		}
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

/**
 * Comprehensive validation for checkout query parameters
 * @param params - Query parameters to validate
 * @returns object with isValid boolean, validation errors, and parsed data if valid
 */
export function validateCheckoutQueryParams(params: URLSearchParams): {
	isValid: boolean;
	errors: string[];
	data?: {
		email: string;
		customPrice?: number;
		variantId?: number;
		metadata?: Record<string, any>;
	};
} {
	const errors: string[] = [];
	const email = params.get('email');
	const customPrice = params.get('customPrice');
	const variantId = params.get('variantId');
	const metadata = params.get('metadata');

	// Validate email
	if (!email) {
		errors.push(VALIDATION_MESSAGES.INVALID_EMAIL_FORMAT);
	} else if (!isValidEmail(email)) {
		errors.push(VALIDATION_MESSAGES.INVALID_EMAIL_FORMAT);
	}

	// Validate custom price
	if (customPrice && !isValidCustomPrice(customPrice)) {
		errors.push(VALIDATION_MESSAGES.INVALID_PRICE);
	}

	// Validate variant ID
	if (variantId && !isValidVariantId(variantId)) {
		errors.push(VALIDATION_MESSAGES.INVALID_VARIANT_ID);
	}

	// Validate metadata
	const metadataValidation = validateMetadata(metadata);
	if (!metadataValidation.isValid) {
		errors.push(metadataValidation.error!);
	}

	if (errors.length > 0) {
		return { isValid: false, errors };
	}

	// Return parsed data if validation passes
	return {
		isValid: true,
		errors: [],
		data: {
			email: email!,
			customPrice: customPrice ? Number(customPrice) : undefined,
			variantId: variantId ? Number(variantId) : undefined,
			metadata: metadataValidation.data
		}
	};
}
