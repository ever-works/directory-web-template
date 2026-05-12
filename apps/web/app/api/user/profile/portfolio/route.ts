import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
	createPortfolioProject,
	listPortfolioProjectsForProfile
} from '@/lib/db/queries/portfolio.queries';
import { portfolioProjectSchema } from '@/lib/validations/user-profile';
import { Logger } from '@/lib/logger';

const logger = Logger.create('userProfilePortfolio');

/**
 * @swagger
 * /api/user/profile/portfolio:
 *   get:
 *     tags: ["User - Profile Portfolio"]
 *     summary: "List the authenticated user's portfolio projects"
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200: { description: "Projects retrieved" }
 *       401: { description: "Unauthorized" }
 */
export async function GET() {
	try {
		const session = await auth();
		if (!session?.user?.clientProfileId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const projects = await listPortfolioProjectsForProfile(session.user.clientProfileId);
		return NextResponse.json({ projects });
	} catch (error) {
		logger.error('Error listing portfolio projects:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/user/profile/portfolio:
 *   post:
 *     tags: ["User - Profile Portfolio"]
 *     summary: "Create a portfolio project"
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       201: { description: "Project created" }
 *       400: { description: "Validation error" }
 *       401: { description: "Unauthorized" }
 */
export async function POST(request: NextRequest) {
	try {
		const session = await auth();
		if (!session?.user?.clientProfileId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		let body: unknown;
		try {
			body = await request.json();
		} catch {
			return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
		}

		const parsed = portfolioProjectSchema.safeParse(body);
		if (!parsed.success) {
			const issue = parsed.error.issues[0];
			return NextResponse.json(
				{ error: issue?.message || 'Validation failed', path: issue?.path },
				{ status: 400 }
			);
		}

		const project = await createPortfolioProject(session.user.clientProfileId, parsed.data);
		if (!project) {
			return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
		}

		return NextResponse.json({ project }, { status: 201 });
	} catch (error) {
		logger.error('Error creating portfolio project:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
