// Native fetch is available in Node.js 18+ (verified engines: node >= 20.19.0)

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
// If not provided, we can try to infer or just fail.
// Vercel CLI often uses project name. API often needs ID.
// We will accept VERCEL_PROJECT_ID as generic identifier.

const VERCEL_TEAM_SCOPE = process.env.VERCEL_TEAM_SCOPE;
const VERCEL_DEPLOYMENT_ID = process.env.VERCEL_DEPLOYMENT_ID;

const CRON_PATH = '/api/cron/sync';
const PRO_SCHEDULE = '*/5 * * * *';

if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
	console.error('Missing VERCEL_TOKEN or VERCEL_PROJECT_ID');
	process.exit(1);
}

const baseUrl = 'https://api.vercel.com';
const teamQuery = VERCEL_TEAM_SCOPE ? `?teamId=${VERCEL_TEAM_SCOPE}` : '';

async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDeployment(deploymentId: string) {
	console.log(`Waiting for deployment ${deploymentId} to be ready...`);
	const maxAttempts = 60; // Wait up to 5 minutes (depending on interval)
	const interval = 5000; // 5 seconds

	for (let i = 0; i < maxAttempts; i++) {
		const res = await fetch(`${baseUrl}/v13/deployments/${deploymentId}${teamQuery}`, {
			headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
		});

		if (!res.ok) {
			console.warn(`Failed to check deployment status: ${res.statusText}`);
			// don't exit, might be transient
		} else {
			const data = (await res.json()) as any;
			console.log(`Deployment status: ${data.readyState}`);
			if (data.readyState === 'READY') {
				return true;
			}
			if (data.readyState === 'ERROR' || data.readyState === 'CANCELED') {
				throw new Error(`Deployment failed with status ${data.readyState}`);
			}
		}
		await sleep(interval);
	}
	throw new Error('Timeout waiting for deployment to be ready');
}

async function main() {
	try {
		if (VERCEL_DEPLOYMENT_ID) {
			await waitForDeployment(VERCEL_DEPLOYMENT_ID);
		}

		console.log('Checking Vercel project plan...');

		// Let's implement the logic: Retrieve all cron jobs, find ours, update it.

		console.log(`Fetching cron jobs for project ${VERCEL_PROJECT_ID}...`);
		const cronsResponse = await fetch(
			`${baseUrl}/v1/cron-jobs${teamQuery ? `${teamQuery}&` : '?'}projectId=${VERCEL_PROJECT_ID}`,
			{
				headers: {
					Authorization: `Bearer ${VERCEL_TOKEN}`
				}
			}
		);

		if (!cronsResponse.ok) {
			throw new Error(`Failed to fetch cron jobs: ${cronsResponse.statusText}`);
		}

		const cronsData = (await cronsResponse.json()) as { crons: any[] };
		const syncCron = cronsData.crons.find((c: any) => c.path === CRON_PATH);

		if (!syncCron) {
			console.log(`Cron job for ${CRON_PATH} not found. Ensure it was deployed first.`);
			return;
		}

		console.log(`Current schedule for ${CRON_PATH}: ${syncCron.schedule}`);

		// Let's check `process.env.VERCEL_PLAN`.
		const isPro =
			process.env.VERCEL_PLAN === 'pro' ||
			process.env.VERCEL_PLAN === 'business' ||
			process.env.VERCEL_PLAN === 'enterprise';

		const targetSchedule = process.env.CRON_FREQUENCY === '5min' || isPro ? PRO_SCHEDULE : null;

		if (targetSchedule && syncCron.schedule !== targetSchedule) {
			console.log(`Upgrading cron schedule to ${targetSchedule}...`);

			const updateResponse = await fetch(`${baseUrl}/v1/cron-jobs/${syncCron.id}${teamQuery}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${VERCEL_TOKEN}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					schedule: targetSchedule
				})
			});

			if (!updateResponse.ok) {
				const errorBody = await updateResponse.text();
				throw new Error(`Failed to update cron job: ${updateResponse.status} - ${errorBody}`);
			}

			console.log('Successfully updated cron schedule.');
		} else {
			console.log('No update needed (already correct or not Pro/configured).');
		}
	} catch (error) {
		console.error('Error updating cron:', error);
		process.exit(1);
	}
}

main();
