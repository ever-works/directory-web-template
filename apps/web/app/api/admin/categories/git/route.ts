import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCategoryGitService } from "@/lib/services/category-git.service";
import { safeErrorResponse } from '@/lib/utils/api-error';

/**
 * @swagger
 * /api/admin/categories/git:
 *   get:
 *     tags: ["Admin - Categories"]
 *     summary: "Get Git repository status and categories"
 *     description: "Returns Git repository status and categories from the configured GitHub repository. Requires admin privileges and proper GitHub configuration."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Git repository status retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: object
 *                   description: "Git repository status information"
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Category"
 *                   description: "List of categories from Git repository"
 *                 message:
 *                   type: string
 *                   example: "Git repository status retrieved successfully"
 *               required: ["success", "status", "categories", "message"]
 *             example:
 *               success: true
 *               status:
 *                 repository: "ever-co/awesome-time-tracking-data"
 *                 branch: "main"
 *                 lastCommit: "abc123def456"
 *                 lastCommitDate: "2024-01-20T10:30:00.000Z"
 *                 lastCommitMessage: "Update categories data"
 *                 isUpToDate: true
 *               categories:
 *                 - id: "productivity"
 *                   name: "Productivity"
 *                   isActive: true
 *                   itemCount: 15
 *                   createdAt: "2024-01-15T10:30:00.000Z"
 *                   updatedAt: "2024-01-15T10:30:00.000Z"
 *                 - id: "design"
 *                   name: "Design"
 *                   isActive: true
 *                   itemCount: 8
 *                   createdAt: "2024-01-16T11:20:00.000Z"
 *                   updatedAt: "2024-01-16T11:20:00.000Z"
 *               message: "Git repository status retrieved successfully"
 *       401:
 *         description: "Unauthorized - Admin access required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized. Admin access required."
 *       500:
 *         description: "Server error - Configuration or Git issues"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   examples:
 *                     config_missing: "DATA_REPOSITORY not configured. Please set DATA_REPOSITORY environment variable."
 *                     invalid_format: "Invalid DATA_REPOSITORY format. Expected: https://github.com/owner/repo"
 *                     token_missing: "GitHub token not configured. Please set GITHUB_TOKEN environment variable."
 *                     git_error: "Failed to get Git repository status"
 */
export async function GET() {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    // Parse DATA_REPOSITORY URL to extract owner and repo
    const dataRepo = process.env.DATA_REPOSITORY;
    if (!dataRepo) {
      return NextResponse.json(
        { 
          success: false, 
          error: "DATA_REPOSITORY not configured. Please set DATA_REPOSITORY environment variable." 
        },
        { status: 500 }
      );
    }

    // Extract owner and repo from URL like: https://github.com/ever-co/awesome-time-tracking-data
    const match = dataRepo.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid DATA_REPOSITORY format. Expected: https://github.com/owner/repo" 
        },
        { status: 500 }
      );
    }

    const [, owner, repo] = match;
    const gitConfig = {
      owner,
      repo,
      token: process.env.GITHUB_TOKEN || '',
      branch: process.env.GITHUB_BRANCH || 'main',
    };

    if (!gitConfig.token) {
      return NextResponse.json(
        { 
          success: false, 
          error: "GitHub token not configured. Please set GITHUB_TOKEN environment variable." 
        },
        { status: 500 }
      );
    }

    // Create Git service
    const gitService = await createCategoryGitService(gitConfig);
    
    // Get status and categories
    const status = await gitService.getStatus();
    const categories = await gitService.readCategories();

    return NextResponse.json({
      success: true,
      status,
      categories,
      message: "Git repository status retrieved successfully",
    });

  } catch (error) {
    return safeErrorResponse(error, 'Failed to get Git repository status');
  }
}

/**
 * @swagger
 * /api/admin/categories/git:
 *   post:
 *     tags: ["Admin - Categories"]
 *     summary: "Create category via Git"
 *     description: "Creates a new category and commits it to the configured GitHub repository. Requires admin privileges and proper GitHub configuration."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: "Unique category identifier"
 *                 example: "productivity"
 *               name:
 *                 type: string
 *                 description: "Category display name"
 *                 example: "Productivity"
 *             required: ["id", "name"]
 *     responses:
 *       200:
 *         description: "Category created and committed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 category:
 *                   $ref: "#/components/schemas/Category"
 *                 message:
 *                   type: string
 *                   example: "Category created and committed to Git repository"
 *               required: ["success", "category", "message"]
 *             example:
 *               success: true
 *               category:
 *                 id: "productivity"
 *                 name: "Productivity"
 *                 isActive: true
 *                 itemCount: 0
 *                 createdAt: "2024-01-20T15:30:00.000Z"
 *                 updatedAt: "2024-01-20T15:30:00.000Z"
 *               message: "Category created and committed to Git repository"
 *       400:
 *         description: "Bad request - Missing required fields"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Category ID and name are required"
 *       401:
 *         description: "Unauthorized - Admin access required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized. Admin access required."
 *       409:
 *         description: "Conflict - Category already exists"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Category already exists"
 *       500:
 *         description: "Server error - Configuration or Git issues"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   examples:
 *                     config_missing: "DATA_REPOSITORY not configured. Please set DATA_REPOSITORY environment variable."
 *                     invalid_format: "Invalid DATA_REPOSITORY format. Expected: https://github.com/owner/repo"
 *                     token_missing: "GitHub token not configured. Please set GH_TOKEN environment variable."
 *                     git_error: "Failed to create category via Git"
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { id, name } = body;

    // Validate required fields
    if (!id || !name) {
      return NextResponse.json(
        { success: false, error: "Category ID and name are required" },
        { status: 400 }
      );
    }

    // Parse DATA_REPOSITORY URL to extract owner and repo
    const dataRepo = process.env.DATA_REPOSITORY;
    if (!dataRepo) {
      return NextResponse.json(
        { 
          success: false, 
          error: "DATA_REPOSITORY not configured. Please set DATA_REPOSITORY environment variable." 
        },
        { status: 500 }
      );
    }

    // Extract owner and repo from URL like: https://github.com/ever-co/awesome-time-tracking-data
    const match = dataRepo.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid DATA_REPOSITORY format. Expected: https://github.com/owner/repo" 
        },
        { status: 500 }
      );
    }

    const [, owner, repo] = match;
    const gitConfig = {
      owner,
      repo,
      token: process.env.GH_TOKEN || '',
      branch: process.env.GITHUB_BRANCH || 'main',
    };

    if (!gitConfig.token) {
      return NextResponse.json(
        { 
          success: false, 
          error: "GitHub token not configured. Please set GH_TOKEN environment variable." 
        },
        { status: 500 }
      );
    }

    // Create Git service and category
    const gitService = await createCategoryGitService(gitConfig);
    const newCategory = await gitService.createCategory({ id, name });

    return NextResponse.json({
      success: true,
      category: newCategory,
      message: "Category created and committed to Git repository",
    });

  } catch (error) {
    console.error('Failed to create category via Git:', error);
    
    // Handle specific errors
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 } // Conflict
      );
    }
    
    return safeErrorResponse(error, 'Failed to create category via Git');
  }
} 