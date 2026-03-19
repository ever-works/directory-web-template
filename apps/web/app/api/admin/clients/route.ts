import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createClientProfile,
  getClientProfiles,
  getUserByEmail
} from '@/lib/db/queries';
import { UserDbService } from '@/lib/services/user-db.service';
import { AuthUserData } from '@/lib/types/user';
import { validatePaginationParams } from '@/lib/utils/pagination-validation';
import crypto from 'crypto';

// Type definitions for request bodies
interface CreateClientRequest {
  /** @deprecated use `email` instead */
  userId?: string;
  email: string;
  displayName?: string;
  username?: string;
  bio?: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  phone?: string;
  website?: string;
  location?: string;
  accountType?: 'individual' | 'business' | 'enterprise';
  status?: 'active' | 'inactive' | 'suspended' | 'trial';
  plan?: 'free' | 'standard' | 'premium';
  timezone?: string;
  language?: string;
  twoFactorEnabled?: boolean;
  emailVerified?: boolean;
  totalSubmissions?: number;
}

/**
 * @swagger
 * /api/admin/clients:
 *   get:
 *     tags: ["Admin - Clients"]
 *     summary: "List client profiles"
 *     description: "Returns a paginated list of client profiles with filtering options. Supports search by name/email, status filtering, plan filtering, and account type filtering. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "page"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: "Page number for pagination"
 *         example: 1
 *       - name: "limit"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: "Number of clients per page"
 *         example: 10
 *       - name: "search"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *         description: "Search term for client name or email"
 *         example: "john"
 *       - name: "status"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["active", "inactive", "suspended", "trial"]
 *         description: "Filter by client status"
 *         example: "active"
 *       - name: "plan"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["free", "standard", "premium"]
 *         description: "Filter by subscription plan"
 *         example: "premium"
 *       - name: "accountType"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["individual", "business", "enterprise"]
 *         description: "Filter by account type"
 *         example: "business"
 *       - name: "provider"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: string
 *         description: "Filter by authentication provider"
 *         example: "google"
 *     responses:
 *       200:
 *         description: "Client profiles retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     clients:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/ClientProfile"
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *                     total:
 *                       type: integer
 *                       example: 47
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                   required: ["page", "totalPages", "total", "limit"]
 *               required: ["success", "data", "meta"]
 *             example:
 *               success: true
 *               data:
 *                 clients:
 *                   - id: "client_123abc"
 *                     displayName: "John Doe"
 *                     username: "johndoe"
 *                     email: "john.doe@example.com"
 *                     bio: "Senior Developer with 10+ years experience"
 *                     jobTitle: "Lead Developer"
 *                     company: "Tech Corp Inc"
 *                     status: "active"
 *                     plan: "premium"
 *                     accountType: "business"
 *                     joinedAt: "2024-01-15T10:30:00.000Z"
 *                     lastActiveAt: "2024-01-20T14:45:00.000Z"
 *                   - id: "client_456def"
 *                     displayName: "Jane Smith"
 *                     username: "janesmith"
 *                     email: "jane.smith@example.com"
 *                     bio: "Product Manager at StartupCo"
 *                     jobTitle: "Product Manager"
 *                     company: "StartupCo"
 *                     status: "active"
 *                     plan: "standard"
 *                     accountType: "individual"
 *                     joinedAt: "2024-01-16T09:15:00.000Z"
 *                     lastActiveAt: "2024-01-20T16:20:00.000Z"
 *               meta:
 *                 page: 1
 *                 totalPages: 5
 *                 total: 47
 *                 limit: 10
 *       400:
 *         description: "Bad request - Invalid pagination parameters"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               invalid_page:
 *                 value:
 *                   error: "Invalid page parameter. Must be a positive integer."
 *               invalid_limit:
 *                 value:
 *                   error: "Invalid limit parameter. Must be between 1 and 100."
 *       401:
 *         description: "Unauthorized - Admin access required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch clients"
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Validate pagination parameters
    const paginationResult = validatePaginationParams(searchParams);
    if ('error' in paginationResult) {
      return NextResponse.json(
        { error: paginationResult.error },
        { status: paginationResult.status }
      );
    }
    const { page, limit } = paginationResult;

    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const plan = searchParams.get('plan') || undefined;
    const accountType = searchParams.get('accountType') || undefined;
    const provider = searchParams.get('provider') || undefined;

    const result = await getClientProfiles({
      page,
      limit,
      search,
      status,
      plan,
      accountType,
      provider,
    });

    // Return in the expected format with meta and data
    return NextResponse.json({
      success: true,
      data: { clients: result.profiles },
      meta: {
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
        limit: result.limit,
      },
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/admin/clients:
 *   post:
 *     tags: ["Admin - Clients"]
 *     summary: "Create client profile"
 *     description: "Creates a new client profile. If the user doesn't exist, creates a new user account with a temporary password. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: "Client email address (required)"
 *                 example: "john.doe@example.com"
 *               displayName:
 *                 type: string
 *                 description: "Display name for the client"
 *                 example: "John Doe"
 *               username:
 *                 type: string
 *                 description: "Unique username"
 *                 example: "johndoe"
 *               bio:
 *                 type: string
 *                 description: "Client biography"
 *                 example: "Senior Developer at Tech Corp"
 *               jobTitle:
 *                 type: string
 *                 description: "Job title"
 *                 example: "Senior Developer"
 *               company:
 *                 type: string
 *                 description: "Company name"
 *                 example: "Tech Corp"
 *               status:
 *                 type: string
 *                 enum: ["active", "inactive", "suspended", "trial"]
 *                 default: "active"
 *                 description: "Client account status"
 *                 example: "active"
 *               plan:
 *                 type: string
 *                 enum: ["free", "standard", "premium"]
 *                 default: "free"
 *                 description: "Subscription plan"
 *                 example: "premium"
 *               accountType:
 *                 type: string
 *                 enum: ["individual", "business", "enterprise"]
 *                 default: "individual"
 *                 description: "Account type"
 *                 example: "business"
 *             required: ["email"]
 *     responses:
 *       200:
 *         description: "Client created successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: "#/components/schemas/ClientProfile"
 *                 message:
 *                   type: string
 *                   example: "Client created successfully"
 *               required: ["success", "data", "message"]
 *             example:
 *               success: true
 *               data:
 *                 id: "client_789ghi"
 *                 displayName: "John Doe"
 *                 username: "johndoe"
 *                 email: "john.doe@example.com"
 *                 bio: "Senior Developer at Tech Corp"
 *                 jobTitle: "Senior Developer"
 *                 company: "Tech Corp"
 *                 status: "active"
 *                 plan: "premium"
 *                 accountType: "business"
 *                 profileImage: null
 *                 joinedAt: "2024-01-20T16:45:00.000Z"
 *                 lastActiveAt: "2024-01-20T16:45:00.000Z"
 *                 createdAt: "2024-01-20T16:45:00.000Z"
 *                 updatedAt: "2024-01-20T16:45:00.000Z"
 *               message: "Client created successfully"
 *       400:
 *         description: "Bad request - Invalid input or user creation failed"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   examples:
 *                     missing_email: "Email is required"
 *                     user_creation_failed: "Failed to create user: [error details]"
 *                     invalid_user: "Failed to create or find user for client"
 *       401:
 *         description: "Unauthorized - Admin access required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to create client"
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raw = await request.json() as Partial<CreateClientRequest>;
    const email = raw.email ?? raw.userId;
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate a stable profile name from display name or email prefix
    const profileName = raw.displayName || email.split('@')[0];

    // Check if user exists, if not create one
    let user: Awaited<ReturnType<typeof getUserByEmail>> | AuthUserData = await getUserByEmail(email);
    
    if (!user) {
      try {
        // Create a new user with the email
        const userService = new UserDbService();
        
        // Generate a cryptographically secure temporary password
        const randomBytes = crypto.randomBytes(6);
        const randomString = randomBytes.toString('hex').toLowerCase();
        const tempPassword = `Temp${randomString}!`;
        
        // Generate username from email if not provided (no longer used here)
        // const username = raw.username || email.split('@')[0];
        
        const newUser = await userService.createUser({
          email: email,
          password: tempPassword,
        });
        
        user = newUser;
      } catch (userError) {
        console.error('Error creating user for client:', userError);
        return NextResponse.json(
          { error: `Failed to create user: ${userError instanceof Error ? userError.message : 'Unknown error'}` },
          { status: 400 }
        );
      }
    }

    // Ensure we have a valid user
    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Failed to create or find user for client' },
        { status: 400 }
      );
    }

    // Create client profile with required email and name
    const clientData = {
      userId: user.id,
      email: user.email || email, // Fallback to original email if user.email is null
      name: profileName,
      displayName: raw.displayName,
      username: raw.username,
      bio: raw.bio,
      jobTitle: raw.jobTitle,
      company: raw.company,
      status: raw.status || 'active',
      plan: raw.plan || 'free',
      accountType: raw.accountType || 'individual',
    };

    const newClient = await createClientProfile(clientData);

    // Direct CRM sync: blocks response but with retry/timeout (non-blocking for DB)
    const crmEnabled = process.env.TWENTY_CRM_ENABLED !== 'false';
    if (crmEnabled) {
      try {
        const { createTwentyCrmSyncServiceFromEnv } = await import(
          '@/lib/services/twenty-crm-sync-factory'
        );
        const { mapClientProfileToPerson } = await import(
          '@/lib/mappers/twenty-crm.mapper'
        );

        const syncService = createTwentyCrmSyncServiceFromEnv();
        const personPayload = mapClientProfileToPerson(newClient);

        // Upsert person to Twenty CRM (has built-in retry/timeout)
        const syncResult = await syncService.upsertPerson(personPayload);

        // Mapping is auto-saved in integration_mappings table
        console.log(`[CRM Sync] ✅ Client ${newClient.id} synced to CRM`, {
          crmId: syncResult.id,
          created: syncResult.created,
        });
      } catch (crmError) {
        // Non-blocking: log error but don't fail client creation
        console.error(`[CRM Sync] ❌ Failed to sync client ${newClient.id}:`, crmError);
      }
    }

    return NextResponse.json({
      success: true,
      data: newClient,
      message: 'Client created successfully',
    });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}

 