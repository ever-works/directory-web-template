'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
interface InstallationStep {
	id: string;
	number: string;
	title: string;
	description: string;
	code: string;
	codeLanguage: string;
	icon: string;
	color: string;
	gradient: string;
	estimatedTime: string;
	difficulty: 'Easy' | 'Medium' | 'Hard';
}

export function InstallationGuide() {
	const [activeStep, setActiveStep] = useState(0);
	const [completedSteps, setCompletedSteps] = useState<number[]>([]);
	const t = useTranslations('help');

	const installationSteps: InstallationStep[] = [
		{
			id: 'clone',
			number: '01',
			title: t('INSTALLATION_STEP1_TITLE'),
			description: t('INSTALLATION_STEP1_DESC'),
			code: `# Clone the repository
git clone https://github.com/ever-co/directory-web-template.git

# Navigate to project directory
cd directory-web-template

# Verify the setup
ls -la`,
			codeLanguage: 'bash',
			icon: '📥',
			color: 'text-neutral-900 dark:text-white',
			gradient: 'from-neutral-700 to-neutral-900',
			estimatedTime: '2 min',
			difficulty: 'Easy'
		},
		{
			id: 'install',
			number: '02',
			title: t('INSTALLATION_STEP2_TITLE'),
			description: t('INSTALLATION_STEP2_DESC'),
			code: `# Using pnpm (recommended)
pnpm install

# Verify installation
pnpm --version`,
			codeLanguage: 'bash',
			icon: '📦',
			color: 'text-neutral-900 dark:text-white',
			gradient: 'from-neutral-700 to-neutral-900',
			estimatedTime: '3 min',
			difficulty: 'Easy'
		},
		{
			id: 'env',
			number: '03',
			title: t('INSTALLATION_STEP3_TITLE'),
			description: t('INSTALLATION_STEP3_DESC'),
			code: `# Copy environment file
cp .env.example .env

# Edit with your configuration
nano .env

# Required variables:
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
AUTH_SECRET=your_nextauth_secret`,
			codeLanguage: 'env',
			icon: '⚙️',
			color: 'text-neutral-900 dark:text-white',
			gradient: 'from-neutral-700 to-neutral-900',
			estimatedTime: '5 min',
			difficulty: 'Medium'
		},
		{
			id: 'database',
			number: '04',
			title: t('INSTALLATION_STEP4_TITLE'),
			description: t('INSTALLATION_STEP4_DESC'),
			code: `# Generate database schema
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Verify database connection
pnpm db:studio

# Optional: Seed with sample data
pnpm db:seed`,
			codeLanguage: 'bash',
			icon: '🗄️',
			color: 'text-neutral-900 dark:text-white',
			gradient: 'from-neutral-700 to-neutral-900',
			estimatedTime: '4 min',
			difficulty: 'Medium'
		},
		{
			id: 'dev',
			number: '05',
			title: t('INSTALLATION_STEP5_TITLE'),
			description: t('INSTALLATION_STEP5_DESC'),
			code: `# Start development server
pnpm dev

# Server will be available at:
# http://localhost:3000

# Build for production
pnpm build

# Start production server
pnpm start`,
			codeLanguage: 'bash',
			icon: '🚀',
			color: 'text-indigo-600 dark:text-indigo-400',
			gradient: 'from-indigo-500 to-purple-500',
			estimatedTime: '2 min',
			difficulty: 'Easy'
		}
	];

	const tips = [
		{
			icon: '⚡',
			title: 'Use pnpm',
			description: 'Faster and more efficient than npm',
			color: 'bg-green-500'
		},
		{
			icon: '🔍',
			title: 'Check Environment',
			description: 'Verify your setup with pnpm check-env',
			color: 'bg-neutral-900 dark:bg-white/30'
		},
		{
			icon: '🔄',
			title: 'Hot Reload',
			description: 'Development mode with live updates',
			color: 'bg-purple-500'
		}
	];

	const handleStepComplete = (stepIndex: number) => {
		if (!completedSteps.includes(stepIndex)) {
			setCompletedSteps([...completedSteps, stepIndex]);
		}
	};

	const handleNextStep = () => {
		if (activeStep < installationSteps.length - 1) {
			handleStepComplete(activeStep);
			setActiveStep(activeStep + 1);
		}
	};

	const handlePrevStep = () => {
		if (activeStep > 0) {
			setActiveStep(activeStep - 1);
		}
	};

	const progressPercentage = (completedSteps.length / installationSteps.length) * 100;

	return (
		<div>
				{/* Header */}
			<div className="mb-6">
				<p className="text-xs font-medium uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1.5">{t('INSTALLATION_GUIDE_TITLE')}</p>
				<h2 className="text-base font-semibold tracking-tight mb-1 text-neutral-900 dark:text-white">
					{t('INSTALLATION_GUIDE_SUBTITLE')}
				</h2>
				<p className="text-neutral-500 dark:text-neutral-400 text-xs max-w-2xl leading-relaxed">
					{t('INSTALLATION_GUIDE_DESCRIPTION')}
				</p>
				</div>

				{/* Progress Bar */}
				<div className="mb-8">
					<div className="flex items-center justify-between mb-2">
						<span className="text-xs font-medium text-slate-600 dark:text-slate-400">
							{t('INSTALLATION_PROGRESS')}
						</span>
						<span className="text-xs text-slate-500 dark:text-slate-400">
							{completedSteps.length} of {installationSteps.length} completed
						</span>
					</div>
					<div className="w-full bg-slate-200 dark:bg-white/8 rounded-full h-1.5">
						<div
								className="bg-neutral-900 dark:bg-white h-1.5 rounded-full transition-all duration-500 ease-out"
							style={{ width: `${progressPercentage}%` }}
						></div>
					</div>
				</div>

				{/* Main Content */}
				<div className="grid lg:grid-cols-3 gap-8">
					{/* Timeline Steps */}
					<div className="lg:col-span-1">
						<div className="space-y-4">
							{installationSteps.map((step, index) => (
								<div
									key={step.id}
								className="relative group cursor-pointer"
								onClick={() => setActiveStep(index)}
							>
								{/* Step Card */}
								<div
									className={`relative bg-white dark:bg-white/3 rounded-xl p-5 border transition-colors duration-200 ${
										activeStep === index
											? 'border-neutral-900/20 dark:border-white/20'
											: completedSteps.includes(index)
												? 'border-neutral-400 dark:border-white/15'
												: 'border-slate-200 dark:border-white/6 hover:border-slate-300 dark:hover:border-white/8'
									}`}
									>
										{/* Step Header */}
										<div className="flex items-center gap-4 mb-4">
											<div
												className={`w-10 h-10 rounded-lg bg-neutral-900 dark:bg-white/10 flex items-center justify-center text-white font-bold text-xs`}
											>
												{completedSteps.includes(index) ? '✓' : step.number}
											</div>
											<div className="flex-1">
												<h3 className="font-semibold text-neutral-900 dark:text-white">{step.title}</h3>
												<div className="flex items-center gap-2 mt-1">
													<span className="text-xs text-slate-500 dark:text-slate-400">
														{step.estimatedTime}
													</span>
													<span
														className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-600 dark:bg-white/8 dark:text-neutral-400"
													>
														{step.difficulty}
													</span>
												</div>
											</div>
											<div className="text-2xl">{step.icon}</div>
										</div>

										{/* Step Description */}
										<p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
											{step.description}
										</p>

									{/* Active Indicator - removed */}
										{/* Completed Indicator */}
										{completedSteps.includes(index) && (
											<div className="absolute -top-2 -right-2 w-6 h-6 bg-neutral-900 dark:bg-white rounded-full flex items-center justify-center">
												<span className="text-white dark:text-neutral-900 text-xs">✓</span>
											</div>
										)}
									</div>

									{/* Connection Line */}
									{index < installationSteps.length - 1 && (
										<div className="absolute left-6 top-full w-0.5 h-4 bg-slate-300 dark:bg-white/1"></div>
									)}
								</div>
							))}
						</div>
					</div>

					{/* Code Preview */}
					<div className="lg:col-span-2">
						<div className="bg-white dark:bg-white/3 rounded-xl border border-slate-200 dark:border-white/6 shadow-sm overflow-hidden">
							{/* Code Header */}
							<div className="bg-slate-100 dark:bg-[#0a0a0a] px-6 py-4 border-b border-slate-200 dark:border-white/6">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="flex gap-2">
											<div className="w-3 h-3 bg-neutral-300 dark:bg-neutral-600 rounded-full"></div>
											<div className="w-3 h-3 bg-neutral-300 dark:bg-neutral-600 rounded-full"></div>
											<div className="w-3 h-3 bg-neutral-300 dark:bg-neutral-600 rounded-full"></div>
										</div>
										<span className="text-slate-600 dark:text-slate-400 text-xs font-medium">
											{installationSteps[activeStep].codeLanguage}
										</span>
									</div>
									<div className="flex items-center gap-4">
										<span className="text-slate-500 dark:text-slate-400 text-xs">
											Step {activeStep + 1} of {installationSteps.length}
										</span>
										<div className="flex items-center gap-2">
											<span className="text-xs text-slate-500 dark:text-slate-400">
												{installationSteps[activeStep].estimatedTime}
											</span>
											<span
												className={`text-xs px-2 py-1 rounded-full ${
													installationSteps[activeStep].difficulty === 'Easy'
														? 'bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300'
														: installationSteps[activeStep].difficulty === 'Medium'
															? 'bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300'
															: 'bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300'
												}`}
											>
												{installationSteps[activeStep].difficulty}
											</span>
										</div>
									</div>
								</div>
							</div>

							{/* Code Content */}
							<div className="p-6">
								<pre className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed overflow-x-auto">
									<code>
										{installationSteps[activeStep].code.split('\n').map((line, index) => (
											<div key={index} className="flex">
												<span className="text-slate-500 dark:text-slate-600 mr-4 select-none w-8 text-right">
													{index + 1}
												</span>
												<span
														className="text-slate-800 dark:text-slate-200"
												>
													{line}
												</span>
											</div>
										))}
									</code>
								</pre>
							</div>

							{/* Navigation */}
							<div className="bg-slate-50 dark:bg-[#0a0a0a]/50 px-6 py-4 border-t border-slate-200 dark:border-white/6">
								<div className="flex items-center justify-between">
									<Button
										onClick={handlePrevStep}
										disabled={activeStep === 0}
										variant="outline"
										className="border-slate-300 dark:border-white/8 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/6"
									>
										← Previous
									</Button>

									<div className="flex items-center gap-2">
										<Button
											onClick={() => handleStepComplete(activeStep)}
											disabled={completedSteps.includes(activeStep)}
											className="bg-neutral-900 hover:bg-neutral-700 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900"
										>
											{completedSteps.includes(activeStep) ? '✓ Completed' : 'Mark Complete'}
										</Button>
									</div>

									<Button
										onClick={handleNextStep}
										disabled={activeStep === installationSteps.length - 1}
										className="bg-neutral-900 hover:bg-neutral-700 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900"
									>
										Next →
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Tips Section */}
				<div className="mt-8">
				<h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-3">
						Quick Tips
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						{tips.map((tip, index) => (
							<div
								key={index}
								className="bg-neutral-50 dark:bg-white/3 rounded-lg p-4 border border-slate-200 dark:border-white/6 hover:border-slate-300 dark:hover:border-white/8 transition-colors"
							>
								<div
									className={`w-8 h-8 bg-neutral-100 dark:bg-white/8 rounded-md flex items-center justify-center text-base mb-3`}
								>
									{tip.icon}
								</div>
								<h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-1">{tip.title}</h4>
								<p className="text-slate-500 dark:text-slate-400 text-xs">{tip.description}</p>
							</div>
						))}
					</div>
				</div>

				{/* Call to Action */}
				<div className="mt-8 text-center">
				<div className="bg-neutral-50 dark:bg-white/3 rounded-xl p-6 border border-neutral-100 dark:border-white/6">
					<h3 className="text-sm font-semibold mb-1.5 text-slate-900 dark:text-white">
						Ready to Launch Your Platform?
					</h3>
					<p className="text-slate-500 dark:text-slate-400 text-xs mb-4 max-w-2xl mx-auto">
						You&apos;re just a few steps away from having your web platform live and ready for users.
					</p>
					<div className="flex flex-col sm:flex-row gap-3 justify-center">
						<button className="h-9 px-4 text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">
							Deploy to Production
						</button>
						<button className="h-9 px-4 text-xs font-medium border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/6 transition-colors">
							View Documentation
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
