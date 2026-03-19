/*
  Seed script to insert realistic local data into the database.
  Usage: DATABASE_URL=... pnpm seed
*/

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import {
  users,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  clientProfiles,
  activityLogs,
  comments,
  votes,
  newsletterSubscriptions,
  type NewUser,
  type NewClientProfile,
  type NewRole,
  type NewUserRole,
  VoteType
} from '@/lib/db/schema';
import * as schema from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getAllPermissions } from '@/lib/permissions/definitions';

async function main() {
  // Load env explicitly; prefer .env.local if present
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: true });
  } else {
    dotenv.config();
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required to run the seed script.');
    process.exit(1);
  }

  const conn = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  const db = drizzle(conn, { schema });

  try {
    // Seed roles (admin, user)
    const existingRoles = await db.select().from(roles).limit(1);
  if (existingRoles.length === 0) {
    const roleRows: NewRole[] = [
      {
        id: 'role-admin',
        name: 'admin',
        description: 'Administrator role',
        status: 'active',
        isAdmin: true,
        created_by: 'system'
      },
      {
        id: 'role-user',
        name: 'user',
        description: 'Standard user role',
        status: 'active',
        isAdmin: false,
        created_by: 'system'
      }
    ];
    await db.insert(roles).values(roleRows);
    console.log('Seeded roles');
  }

  // Seed permissions
  const existingPermissions = await db.select().from(permissions).limit(1);
  if (existingPermissions.length === 0) {
    const allPermissions = getAllPermissions();
    const permissionRows = allPermissions.map(permission => ({
      id: randomUUID(),
      key: permission,
      description: permission.replace(':', ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
    }));

    await db.insert(permissions).values(permissionRows);
    console.log(`Seeded ${permissionRows.length} permissions`);

    // Create role-permission associations for admin role
    const adminRole = await db.select().from(roles).where(sql`${roles.id} = 'role-admin'`).limit(1);
    if (adminRole.length > 0) {
      const adminRolePermissions = permissionRows.map(perm => ({
        roleId: 'role-admin',
        permissionId: perm.id
      }));

      await db.insert(rolePermissions).values(adminRolePermissions);
      console.log(`Assigned all permissions to admin role`);
    }
  }

  // Seed users
  const usersCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);
  const totalUsers = usersCount[0]?.count ?? 0;

  if (totalUsers === 0) {
    const now = new Date();
    const userRows: NewUser[] = Array.from({ length: 20 }).map((_, i) => ({
      id: randomUUID(),
      email: `user${i + 1}@example.com`,
      emailVerified: now,
      passwordHash: null,
      createdAt: new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
      updatedAt: now,
      deletedAt: null
    }));
    await db.insert(users).values(userRows);
    console.log('Seeded users');

    // Client profiles
    const profileRows: NewClientProfile[] = userRows.map((u, i) => ({
      id: randomUUID(),
      userId: u.id as string,
      email: u.email!,
      name: `User ${i + 1}`,
      displayName: `User ${i + 1}`,
      username: `user${i + 1}`,
      bio: i % 3 === 0 ? 'Power user' : null,
      jobTitle: i % 2 === 0 ? 'Developer' : 'Designer',
      company: i % 2 === 0 ? 'Acme Inc.' : 'Globex',
      industry: 'Software',
      phone: null,
      website: null,
      location: 'Remote',
      avatar: null,
      accountType: 'individual',
      status: 'active',
      plan: i % 5 === 0 ? 'premium' : i % 3 === 0 ? 'standard' : 'free',
      timezone: 'UTC',
      language: 'en',
      twoFactorEnabled: false,
      emailVerified: true,
      totalSubmissions: Math.floor(Math.random() * 10),
      notes: null,
      tags: null,
      createdAt: now,
      updatedAt: now
    }));
    await db.insert(clientProfiles).values(profileRows);
    console.log('Seeded client profiles');

    // Assign roles: first user is admin
    const userRoleRows: NewUserRole[] = userRows.map((u, i) => ({
      userId: u.id as string,
      roleId: i === 0 ? 'role-admin' : 'role-user',
      createdAt: now
    }));
    await db.insert(userRoles).values(userRoleRows);
    console.log('Assigned user roles');

    // Newsletter subscriptions (every 3rd user)
    const newsletterRows = userRows
      .filter((_, i) => i % 3 === 0)
      .map((u) => ({
        id: randomUUID(),
        email: u.email!,
        isActive: true,
        subscribedAt: now,
        unsubscribedAt: null,
        lastEmailSent: null,
        source: 'seed'
      }));
    if (newsletterRows.length) {
      await db.insert(newsletterSubscriptions).values(newsletterRows);
      console.log('Seeded newsletter subscriptions');
    }

    // Activity logs
    const profiles = await db
      .select({ profileId: clientProfiles.id, userId: clientProfiles.userId })
      .from(clientProfiles);
    const activityRows = profiles.slice(0, 30).map((p, i) => ({
      userId: p.userId,
      action: i % 4 === 0 ? 'SIGN_UP' : i % 4 === 1 ? 'SIGN_IN' : i % 4 === 2 ? 'COMMENT' : 'VOTE',
      timestamp: new Date(now.getTime() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
      ipAddress: '127.0.0.1'
    }));
    if (activityRows.length) {
      await db.insert(activityLogs).values(activityRows);
      console.log('Seeded activity logs');
    }

    // Comments and votes (lightweight)
    const commentRows = profiles.slice(0, 15).map((p, i) => ({
      id: randomUUID(),
      content: `This is a sample comment ${i + 1}`,
      userId: p.profileId, // Use profileId instead of userId
      itemId: `item-${(i % 5) + 1}`,
      rating: (i % 5) + 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    }));
    if (commentRows.length) {
      await db.insert(comments).values(commentRows);
      console.log('Seeded comments');
    }

    const voteRows = profiles.slice(0, 25).map((p, i) => ({
      id: randomUUID(),
      userId: p.profileId, // Use profileId instead of userId
      itemId: `item-${(i % 5) + 1}`,
      voteType: i % 4 === 0 ? VoteType.DOWNVOTE : VoteType.UPVOTE,
      createdAt: now,
      updatedAt: now
    }));
    if (voteRows.length) {
      await db.insert(votes).values(voteRows);
      console.log('Seeded votes');
    }
  }
  console.log('Seed complete');
} finally {
  await conn.end({ timeout: 1 });
}
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});


