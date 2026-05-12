import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
	deletePortfolioProject,
	getPortfolioProjectById,
	updatePortfolioProject
} from '@/lib/db/queries/portfolio.queries';
import { updatePortfolioProjectSchema } from '@/lib/validations/user-profile';
import { Logger } from '@/lib/logger';

const logger = Logger.create('userProfilePortfolioItem');

/**
 * @swagger
 * /api/user/profile/portfolio/{id}:
 *   patch:
 *     tags: ["User - Profile Portfolio"]
 *     summary: "Update a portfolio project owned by the authenticated user"
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200: { description: "Project updated" }
 *       400: { description: "Validation error" }
 *       401: { description: "Unauthorized" }
 *       404: { description: "Project not found" }
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();
		if (!session?.user?.clientProfileId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await ctx.params;
		if (!id) {
			return NextResponse.json({ error: 'Missing project id' }, { status: 400 });
		}

		// Confirm ownership before applying the update.
		const existing = await getPortfolioProjectById(id);
		if (!existing || existing.clientProfileId !== session.user.clientProfileId) {
			return NextResponse.json({ error: 'Project not found' }, { status: 404 });
		}

		let body: unknown;
		try {
			body = await request.json();
		} catch {
			return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
		}

		const parsed = updatePortfolioProjectSchema.safeParse(body);
		if (!parsed.success) {
			const issue = parsed.error.issues[0];
			return NextResponse.json(
				{ error: issue?.message || 'Validation failed', path: issue?.path },
				{ status: 400 }
			);
		}

		const project = await updatePortfolioProject(id, session.user.clientProfileId, parsed.data);
		if (!project) {
			return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
		}

		return NextResponse.json({ project });
	} catch (error) {
		logger.error('Error updating portfolio project:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/user/profile/portfolio/{id}:
 *   delete:
 *     tags: ["User - Profile Portfolio"]
 *     summary: "Delete a portfolio project owned by the authenticated user"
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200: { description: "Project deleted" }
 *       401: { description: "Unauthorized" }
 *       404: { description: "Project not found" }
 */
export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();
		if (!session?.user?.clientProfileId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await ctx.params;
		if (!id) {
			return NextResponse.json({ error: 'Missing project id' }, { status: 400 });
		}

		const deleted = await deletePortfolioProject(id, session.user.clientProfileId);
		if (!deleted) {
			return NextResponse.json({ error: 'Project not found' }, { status: 404 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		logger.error('Error deleting portfolio project:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
