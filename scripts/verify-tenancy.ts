import { db } from '../lib/db/drizzle';
import { users, clientProfiles } from '../lib/db/schema';
import { createTenantWithOwner } from '../lib/services/tenant.service';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

async function verifyTenancy() {
	console.log('🧪 Starting Multi-Tenancy Verification...');

	// 1. Create two users with their own organizations
	const user1Id = crypto.randomUUID();
	const user2Id = crypto.randomUUID();

	const org1Name = `Test Org 1 ${crypto.randomBytes(4).toString('hex')}`;
	const org2Name = `Test Org 2 ${crypto.randomBytes(4).toString('hex')}`;

	console.log(`\n📝 Creating Organization 1: ${org1Name}`);
	const result1 = await createTenantWithOwner(user1Id, {
		name: org1Name,
		description: 'Test Verification Org 1'
	});
	console.log(`   ✅ Created Tenant 1: ${result1.tenant.id} (${result1.tenant.slug})`);
	console.log(`   ✅ User 1 assigned as owner`);

	console.log(`\n📝 Creating Organization 2: ${org2Name}`);
	const result2 = await createTenantWithOwner(user2Id, {
		name: org2Name,
		description: 'Test Verification Org 2'
	});
	console.log(`   ✅ Created Tenant 2: ${result2.tenant.id} (${result2.tenant.slug})`);
	console.log(`   ✅ User 2 assigned as owner`);

	// 2. Create client profiles in each tenant
	console.log('\n📝 Creating client profiles in respective tenants...');

	await db.insert(clientProfiles).values({
		userId: user1Id,
		email: `user1-${crypto.randomBytes(4).toString('hex')}@test.com`,
		name: 'User One',
		displayName: 'User One',
		username: `user1-${crypto.randomBytes(4).toString('hex')}`,
		tenantId: result1.tenant.id,
		status: 'active'
	});

	await db.insert(clientProfiles).values({
		userId: user2Id,
		email: `user2-${crypto.randomBytes(4).toString('hex')}@test.com`,
		name: 'User Two',
		displayName: 'User Two',
		username: `user2-${crypto.randomBytes(4).toString('hex')}`,
		tenantId: result2.tenant.id,
		status: 'active'
	});

	console.log('   ✅ Client profiles created');

	// 3. Verify Isolation
	console.log('\n🔍 Verifying Data Isolation...');

	const profilesInTenant1 = await db
		.select()
		.from(clientProfiles)
		.where(eq(clientProfiles.tenantId, result1.tenant.id));

	const profilesInTenant2 = await db
		.select()
		.from(clientProfiles)
		.where(eq(clientProfiles.tenantId, result2.tenant.id));

	console.log(`   Tenant 1 has ${profilesInTenant1.length} profile(s)`);
	console.log(`   Tenant 2 has ${profilesInTenant2.length} profile(s)`);

	let allPassed = true;

	if (profilesInTenant1.length !== 1 || profilesInTenant1[0].userId !== user1Id) {
		console.error('   ❌ Tenant 1 isolation failed! Found wrong data or count.');
		allPassed = false;
	} else {
		console.log('   ✅ Tenant 1 data is correct and isolated.');
	}

	if (profilesInTenant2.length !== 1 || profilesInTenant2[0].userId !== user2Id) {
		console.error('   ❌ Tenant 2 isolation failed! Found wrong data or count.');
		allPassed = false;
	} else {
		console.log('   ✅ Tenant 2 data is correct and isolated.');
	}

	// 4. Verify user tenant assignment
	console.log('\n🔍 Verifying User Tenant Assignment...');
	const user1 = await db
		.select()
		.from(users)
		.where(eq(users.id, user1Id))
		.then((r) => r[0]);
	const user2 = await db
		.select()
		.from(users)
		.where(eq(users.id, user2Id))
		.then((r) => r[0]);

	if (user1.tenantId !== result1.tenant.id) {
		console.error(`   ❌ User 1 has wrong tenantId: ${user1.tenantId}`);
		allPassed = false;
	} else {
		console.log('   ✅ User 1 assigned to correct tenant.');
	}

	if (user2.tenantId !== result2.tenant.id) {
		console.error(`   ❌ User 2 has wrong tenantId: ${user2.tenantId}`);
		allPassed = false;
	} else {
		console.log('   ✅ User 2 assigned to correct tenant.');
	}

	console.log('\n' + (allPassed ? '🎉 VERIFICATION SUCCESSFUL' : '💥 VERIFICATION FAILED'));
	process.exit(allPassed ? 0 : 1);
}

verifyTenancy().catch(console.error);
