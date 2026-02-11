import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
	linkItemToCompany,
	unlinkItemFromCompany,
	getCompanyForItem,
} from '@/lib/db/queries/company.queries';
import {
	assignCompanyToItemSchema,
	removeCompanyFromItemSchema,
} from '@/lib/validations/company';
import { ZodError } from 'zod';
import { safeErrorMessage } from '@/lib/utils/api-error';

/**
 * GET /api/items/[slug]/company
 * Get the company assigned to an item
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	try {
		const session = await auth();

		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { slug } = await params;
		const normalizedSlug = slug.toLowerCase().trim();

		const company = await getCompanyForItem(normalizedSlug);

		if (!company) {
			return NextResponse.json({ success: true, data: null });
		}

		return NextResponse.json({
			success: true,
			data: company,
		});
	} catch (error) {
		console.error('Error fetching item company:', error);
		return NextResponse.json({ error: 'Failed to fetch item company' }, { status: 500 });
	}
}

/**
 * POST /api/items/[slug]/company
 * Assign a company to an item (idempotent)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	try {
		const session = await auth();

		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { slug } = await params;
		const body = await request.json();

		// Validate request body
		let validatedData;
		try {
			validatedData = assignCompanyToItemSchema.parse({
				itemSlug: slug,
				companyId: body.companyId,
			});
		} catch (error) {
			if (error instanceof ZodError) {
				const details = error.issues.map((err) => ({
					field: err.path.join('.'),
					message: err.message,
				}));
				return NextResponse.json({ error: 'Validation error', details }, { status: 400 });
			}
			throw error;
		}

		// Link item to company (idempotent)
		const result = await linkItemToCompany(validatedData.itemSlug, validatedData.companyId);

		return NextResponse.json(
			{
				success: true,
				data: result.association,
				created: result.created,
				updated: result.updated,
			},
			{ status: result.created ? 201 : 200 }
		);
	} catch (error) {
		console.error('Error assigning company to item:', error);

		// Handle specific errors
		if (error instanceof Error) {
			if (error.message.includes('already linked to another company')) {
				return NextResponse.json({ error: safeErrorMessage(error, 'Item is already linked to another company') }, { status: 409 });
			}
			if (
				error.message.includes('not found') ||
				error.message.includes('does not exist')
			) {
				return NextResponse.json({ error: safeErrorMessage(error, 'Resource not found') }, { status: 404 });
			}
		}

		return NextResponse.json({ error: 'Failed to assign company to item' }, { status: 500 });
	}
}

/**
 * DELETE /api/items/[slug]/company
 * Remove company assignment from an item (idempotent)
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	try {
		const session = await auth();

		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { slug } = await params;

		// Validate request
		let validatedData;
		try {
			validatedData = removeCompanyFromItemSchema.parse({
				itemSlug: slug,
			});
		} catch (error) {
			if (error instanceof ZodError) {
				const details = error.issues.map((err) => ({
					field: err.path.join('.'),
					message: err.message,
				}));
				return NextResponse.json({ error: 'Validation error', details }, { status: 400 });
			}
			throw error;
		}

		// Unlink item from company (idempotent)
		const result = await unlinkItemFromCompany(validatedData.itemSlug);

		return NextResponse.json({
			success: true,
			deleted: result.deleted,
		});
	} catch (error) {
		console.error('Error removing company from item:', error);

		if (
			error instanceof Error &&
			(error.message.includes('not found') || error.message.includes('does not exist'))
		) {
			return NextResponse.json({ error: safeErrorMessage(error, 'Resource not found') }, { status: 404 });
		}

		return NextResponse.json({ error: 'Failed to remove company from item' }, { status: 500 });
	}
}
